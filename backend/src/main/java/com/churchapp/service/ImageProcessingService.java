package com.churchapp.service;

import com.churchapp.dto.ImageProcessingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Service for processing and optimizing images
 * Implements server-side image compression similar to Facebook/X approach
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ImageProcessingService {

    @Value("${media.image.max-width:1920}")
    private int maxWidth;

    @Value("${media.image.max-height:1920}")
    private int maxHeight;

    @Value("${media.image.jpeg-quality:0.85}")
    private double jpegQuality;

    @Value("${media.image.strip-exif:true}")
    private boolean stripExif;

    /**
     * Process and optimize an image
     * 
     * @param file Original image file
     * @return Processing result with optimized image data
     * @throws IOException If processing fails
     */
    public ImageProcessingResult processImage(MultipartFile file) throws IOException {
        // Get original size BEFORE reading stream (important!)
        long originalSize = file.getSize();
        if (originalSize <= 0) {
            // Fallback: try to get size from bytes if getSize() returns 0
            byte[] fileBytes = file.getBytes();
            originalSize = fileBytes.length;
            log.warn("File.getSize() returned 0, using byte array length: {} bytes", originalSize);
        }
        log.info("Processing image: {} ({} bytes)", file.getOriginalFilename(), originalSize);

        // Read original image
        BufferedImage originalImage = ImageIO.read(file.getInputStream());
        if (originalImage == null) {
            throw new IOException("Could not read image file");
        }

        int originalWidth = originalImage.getWidth();
        int originalHeight = originalImage.getHeight();

        log.debug("Original image dimensions: {}x{}", originalWidth, originalHeight);

        // Calculate new dimensions (maintain aspect ratio)
        int newWidth = originalWidth;
        int newHeight = originalHeight;

        if (originalWidth > maxWidth || originalHeight > maxHeight) {
            double widthRatio = (double) maxWidth / originalWidth;
            double heightRatio = (double) maxHeight / originalHeight;
            double ratio = Math.min(widthRatio, heightRatio);

            newWidth = (int) (originalWidth * ratio);
            newHeight = (int) (originalHeight * ratio);

            log.debug("Resizing image to: {}x{} (ratio: {})", newWidth, newHeight, ratio);
        }

        // Process image: resize and compress to JPEG
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        
        Thumbnails.of(originalImage)
                .size(newWidth, newHeight)
                .outputFormat("jpg")
                .outputQuality(jpegQuality)
                .toOutputStream(outputStream);

        byte[] processedData = outputStream.toByteArray();
        long processedSize = processedData.length;
        
        // Calculate compression metrics
        double compressionRatio = originalSize > 0 ? (double) processedSize / originalSize : 1.0;
        int reductionPercent = originalSize > 0 ? (int) Math.round((1 - compressionRatio) * 100) : 0;
        
        // Format compression ratio for logging
        String compressionRatioStr = String.format("%.2f", compressionRatio);

        log.info("Image processed: {} bytes -> {} bytes ({}% reduction, ratio: {})",
                originalSize, processedSize, reductionPercent, compressionRatioStr);

        return new ImageProcessingResult(
                processedData,
                "image/jpeg",
                originalSize,
                processedSize,
                originalWidth,
                originalHeight,
                newWidth,
                newHeight,
                compressionRatio
        );
    }

    /**
     * Check if image needs processing
     * 
     * @param file Image file to check
     * @return true if image exceeds limits and needs processing
     */
    public boolean needsProcessing(MultipartFile file) {
        try {
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) {
                return false;
            }

            return image.getWidth() > maxWidth || 
                   image.getHeight() > maxHeight ||
                   file.getSize() > (2 * 1024 * 1024); // More than 2MB
        } catch (IOException e) {
            log.warn("Could not check if image needs processing", e);
            return true; // Process anyway to be safe
        }
    }
}

