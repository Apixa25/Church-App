package com.churchapp.service;

import com.churchapp.util.InMemoryMultipartFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.time.Duration;
import java.util.concurrent.Executor;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
public class FileUploadService {
    
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final ImageProcessingService imageProcessingService;
    private final VideoProcessingService videoProcessingService;
    private final Executor mediaProcessingExecutor;
    
    public FileUploadService(
            S3Client s3Client,
            S3Presigner s3Presigner,
            ImageProcessingService imageProcessingService,
            VideoProcessingService videoProcessingService,
            @Qualifier("mediaProcessingExecutor") Executor mediaProcessingExecutor) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.imageProcessingService = imageProcessingService;
        this.videoProcessingService = videoProcessingService;
        this.mediaProcessingExecutor = mediaProcessingExecutor;
    }
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;
    
    @Value("${media.processing.async.enabled:true}")
    private boolean asyncProcessingEnabled;
    
    // File size limits (configurable)
    @Value("${media.upload.video.max-size:78643200}") // 75MB default
    private long maxVideoSize;
    
    @Value("${media.upload.image.max-size:20971520}") // 20MB default
    private long maxImageSize;
    
    @Value("${media.upload.audio.max-size:10485760}") // 10MB default
    private long maxAudioSize;
    
    @Value("${media.upload.document.max-size:10485760}") // 10MB default
    private long maxDocumentSize;
    
    /**
     * Upload file with async processing (Facebook/X approach)
     * Uploads original immediately, processes in background
     */
    public String uploadFile(MultipartFile file, String folder) {
        try {
            // Validate file
            validateFile(file);
            
            String contentType = file.getContentType();
            boolean isImage = contentType != null && contentType.startsWith("image/");
            boolean isVideo = contentType != null && contentType.startsWith("video/");
            
            // Read file into memory BEFORE uploading (so we can reuse for processing)
            // This is necessary because MultipartFile streams can only be read once
            byte[] fileBytes = file.getBytes();
            MultipartFile fileForProcessing = new InMemoryMultipartFile(
                file.getOriginalFilename(),
                file.getContentType(),
                fileBytes
            );
            
            // Upload original to S3 immediately (fast response)
            String originalUrl = uploadOriginalFileFromBytes(
                fileBytes, 
                file.getContentType(), 
                file.getOriginalFilename(),
                folder
            );
            log.info("Original file uploaded: {}", originalUrl);
            
            // Process in background if enabled and file type requires processing
            if (asyncProcessingEnabled && (isImage || isVideo)) {
                if (isImage) {
                    processImageAsync(fileForProcessing, originalUrl, folder);
                } else if (isVideo) {
                    processVideoAsync(fileForProcessing, originalUrl, folder);
                }
            }
            
            // Return original URL immediately (user can continue)
            return originalUrl;
            
        } catch (Exception e) {
            log.error("Error uploading file to S3 - bucket: {}, region: {}", bucketName, region, e);
            log.error("Exception details: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Upload original file to S3 from bytes (synchronous, fast)
     */
    private String uploadOriginalFileFromBytes(byte[] fileBytes, String contentType, String originalFilename, String folder) {
        String fileExtension = getFileExtension(originalFilename);
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
        String key = folder + "/originals/" + uniqueFilename;
        
        log.info("Uploading original file to S3: bucket={}, key={}, size={}", 
                bucketName, key, fileBytes.length);
        
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength((long) fileBytes.length)
                .build();
        
        s3Client.putObject(putObjectRequest, 
                RequestBody.fromInputStream(new ByteArrayInputStream(fileBytes), fileBytes.length));
        
        return generateAccessibleUrl(key);
    }
    
    /**
     * Process image asynchronously
     */
    private void processImageAsync(MultipartFile file, String originalUrl, String folder) {
        mediaProcessingExecutor.execute(() -> {
            try {
                log.info("Starting async image processing for: {}", originalUrl);
                
                // Process image (file is already in memory)
                var result = imageProcessingService.processImage(file);
                
                // Upload optimized version
                String optimizedKey = folder + "/optimized/" + UUID.randomUUID() + ".jpg";
                uploadProcessedFile(result.getProcessedImageData(), optimizedKey, "image/jpeg");
                
                String optimizedUrl = generateAccessibleUrl(optimizedKey);
                double compressionRatio = result.getCompressionRatio();
                int reductionPercent = compressionRatio > 0 && compressionRatio <= 1.0 
                    ? (int) Math.round((1 - compressionRatio) * 100) 
                    : 0;
                log.info("Image processing completed: {} -> {} ({}% reduction)",
                        originalUrl, optimizedUrl, reductionPercent);
                
                // TODO: Update database to use optimized URL instead of original
                // This will be implemented when we add the MediaFile entity
                
            } catch (Exception e) {
                log.error("Error processing image: {}", originalUrl, e);
                // Keep original if processing fails
            }
        });
    }
    
    /**
     * Process video asynchronously
     */
    private void processVideoAsync(MultipartFile file, String originalUrl, String folder) {
        mediaProcessingExecutor.execute(() -> {
            try {
                log.info("Starting async video processing for: {}", originalUrl);
                
                // Process video (file is already in memory)
                var result = videoProcessingService.processVideo(file);
                
                // Upload optimized version
                String optimizedKey = folder + "/optimized/" + UUID.randomUUID() + ".mp4";
                uploadProcessedFile(result.getProcessedVideoData(), optimizedKey, "video/mp4");
                
                String optimizedUrl = generateAccessibleUrl(optimizedKey);
                log.info("Video processing completed: {} -> {} ({}% reduction)",
                        originalUrl, optimizedUrl,
                        Math.round((1 - result.getCompressionRatio()) * 100));
                
                // TODO: Update database to use optimized URL instead of original
                // This will be implemented when we add the MediaFile entity
                
            } catch (Exception e) {
                log.error("Error processing video: {}", originalUrl, e);
                // Keep original if processing fails
            }
        });
    }
    
    /**
     * Upload processed file to S3
     */
    private void uploadProcessedFile(byte[] data, String key, String contentType) {
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .contentLength((long) data.length)
                    .build();
            
            s3Client.putObject(putObjectRequest, 
                    RequestBody.fromInputStream(new ByteArrayInputStream(data), data.length));
            
            log.debug("Processed file uploaded: {}", key);
        } catch (Exception e) {
            log.error("Error uploading processed file: {}", key, e);
            throw new RuntimeException("Failed to upload processed file", e);
        }
    }
    
    public void deleteFile(String fileUrl) {
        try {
            // Extract key from URL
            String key = extractKeyFromUrl(fileUrl);
            
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            
            s3Client.deleteObject(deleteObjectRequest);
            log.info("File deleted successfully: {}", fileUrl);
            
        } catch (Exception e) {
            log.error("Error deleting file from S3: {}", fileUrl, e);
            throw new RuntimeException("Failed to delete file", e);
        }
    }
    
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        
        String contentType = file.getContentType();
        long fileSize = file.getSize();
        
        // Different size limits by type (server will compress)
        if (contentType != null && contentType.startsWith("video/")) {
            if (fileSize > maxVideoSize) {
                throw new IllegalArgumentException(
                    String.format("Video file size (%.2f MB) exceeds maximum limit of %.2f MB", 
                        fileSize / (1024.0 * 1024.0), maxVideoSize / (1024.0 * 1024.0))
                );
            }
        } else if (contentType != null && contentType.startsWith("image/")) {
            if (fileSize > maxImageSize) {
                throw new IllegalArgumentException(
                    String.format("Image file size (%.2f MB) exceeds maximum limit of %.2f MB", 
                        fileSize / (1024.0 * 1024.0), maxImageSize / (1024.0 * 1024.0))
                );
            }
        } else if (contentType != null && contentType.startsWith("audio/")) {
            if (fileSize > maxAudioSize) {
                throw new IllegalArgumentException(
                    String.format("Audio file size (%.2f MB) exceeds maximum limit of %.2f MB", 
                        fileSize / (1024.0 * 1024.0), maxAudioSize / (1024.0 * 1024.0))
                );
            }
        } else {
            // Documents and other types
            if (fileSize > maxDocumentSize) {
                throw new IllegalArgumentException(
                    String.format("File size (%.2f MB) exceeds maximum limit of %.2f MB", 
                        fileSize / (1024.0 * 1024.0), maxDocumentSize / (1024.0 * 1024.0))
                );
            }
        }
        
        // Check file type - allow images, videos, audio, and documents
        if (contentType == null || !isAllowedFileType(contentType)) {
            throw new IllegalArgumentException("File type not supported. Allowed types: images (JPEG, PNG, GIF, WebP, HEIC, HEIF), videos (MP4, WebM, MOV), audio (MP3, WAV, OGG), documents (PDF, DOC, DOCX, TXT)");
        }
    }
    
    private boolean isAllowedFileType(String contentType) {
        // Images (including HEIC/HEIF for iPhone)
        if (contentType.equals("image/jpeg") || contentType.equals("image/jpg") ||
            contentType.equals("image/png") || contentType.equals("image/gif") ||
            contentType.equals("image/webp") ||
            contentType.equals("image/heic") || contentType.equals("image/heif")) {
            return true;
        }
        
        // Videos (including MOV for iPhone)
        if (contentType.equals("video/mp4") || contentType.equals("video/webm") ||
            contentType.equals("video/quicktime")) { // MOV files
            return true;
        }
        
        // Audio
        if (contentType.equals("audio/mp3") || contentType.equals("audio/mpeg") ||
            contentType.equals("audio/wav") || contentType.equals("audio/ogg")) {
            return true;
        }
        
        // Documents
        if (contentType.equals("application/pdf") || contentType.equals("text/plain") ||
            contentType.equals("application/msword") || 
            contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
            return true;
        }
        
        return false;
    }
    
    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }
    
    private String extractKeyFromUrl(String fileUrl) {
        if (fileUrl == null || !fileUrl.contains(bucketName)) {
            throw new IllegalArgumentException("Invalid file URL");
        }
        
        // Extract the key part after the bucket name in the URL
        String urlPattern = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
        if (fileUrl.startsWith(urlPattern)) {
            return fileUrl.substring(urlPattern.length());
        }
        
        throw new IllegalArgumentException("URL format not recognized");
    }
    
    /**
     * Generate an accessible URL for the uploaded file.
     * First tries public URL, falls back to pre-signed URL if bucket is private.
     */
    private String generateAccessibleUrl(String key) {
        try {
            // Try public URL first (faster and no expiration)
            String publicUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
            
            // For now, always return public URL and let bucket policy handle access
            // If you want to use pre-signed URLs instead, uncomment the lines below:
            
            /*
            // Generate pre-signed URL (24 hour expiration)
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(24))
                    .getObjectRequest(getObjectRequest)
                    .build();
            
            PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
            return presignedRequest.url().toString();
            */
            
            return publicUrl;
            
        } catch (Exception e) {
            log.error("Error generating accessible URL for key: {}", key, e);
            // Fallback to public URL format
            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
        }
    }
}