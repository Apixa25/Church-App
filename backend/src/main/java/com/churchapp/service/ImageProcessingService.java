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
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

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

        // Read original image - support WebP and other formats
        BufferedImage originalImage;
        try {
            // Read bytes first to ensure we can retry if needed
            byte[] imageBytes = file.getBytes();
            
            // Try ImageIO first (now supports WebP with imageio-webp library)
            ByteArrayInputStream inputStream1 = new ByteArrayInputStream(imageBytes);
            originalImage = ImageIO.read(inputStream1);
            
            // If ImageIO fails, try Thumbnailator as fallback
            if (originalImage == null) {
                log.debug("ImageIO returned null, trying Thumbnailator...");
                ByteArrayInputStream inputStream2 = new ByteArrayInputStream(imageBytes);
                originalImage = Thumbnails.of(inputStream2)
                        .scale(1.0)  // Read at original size
                        .asBufferedImage();
            }
            
            if (originalImage == null) {
                // Log available ImageIO readers for debugging
                String[] readerFormatNames = ImageIO.getReaderFormatNames();
                log.error("Could not read image. Available formats: {}", String.join(", ", readerFormatNames));
                throw new IOException("Could not read image file. Format may not be supported. " +
                        "File: " + file.getOriginalFilename() + ", ContentType: " + file.getContentType());
            }
        } catch (IOException e) {
            log.error("Error reading image file: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error reading image: {}", e.getMessage(), e);
            throw new IOException("Could not read image file: " + e.getMessage(), e);
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
            // Read bytes first to support multiple read attempts
            byte[] imageBytes = file.getBytes();
            
            // Try ImageIO first (supports WebP with imageio-webp library)
            ByteArrayInputStream inputStream1 = new ByteArrayInputStream(imageBytes);
            BufferedImage image = ImageIO.read(inputStream1);
            
            // Fallback to Thumbnailator if ImageIO fails
            if (image == null) {
                ByteArrayInputStream inputStream2 = new ByteArrayInputStream(imageBytes);
                image = Thumbnails.of(inputStream2)
                        .scale(1.0)
                        .asBufferedImage();
            }
            
            if (image == null) {
                return false;
            }

            return image.getWidth() > maxWidth || 
                   image.getHeight() > maxHeight ||
                   file.getSize() > (2 * 1024 * 1024); // More than 2MB
        } catch (Exception e) {
            log.warn("Could not check if image needs processing: {}", e.getMessage());
            // If we can't read it, assume it needs processing
            return true;
        }
    }
}

