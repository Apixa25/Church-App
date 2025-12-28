package com.churchapp.service;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import com.churchapp.util.InMemoryMultipartFile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.io.ByteArrayInputStream;
import java.time.Duration;
import java.util.concurrent.Executor;
import java.util.UUID;

@Service
@Slf4j
public class FileUploadService {
    
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final ImageProcessingService imageProcessingService;
    private final MediaConvertVideoService mediaConvertVideoService;
    private final Executor mediaProcessingExecutor;
    private final MediaFileRepository mediaFileRepository;
    
    public FileUploadService(
            S3Client s3Client,
            S3Presigner s3Presigner,
            ImageProcessingService imageProcessingService,
            MediaConvertVideoService mediaConvertVideoService,
            @Qualifier("mediaProcessingExecutor") Executor mediaProcessingExecutor,
            MediaFileRepository mediaFileRepository) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.imageProcessingService = imageProcessingService;
        this.mediaConvertVideoService = mediaConvertVideoService;
        this.mediaProcessingExecutor = mediaProcessingExecutor;
        this.mediaFileRepository = mediaFileRepository;
    }
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;
    
    @Value("${aws.cloudfront.distribution-url:}")
    private String cloudFrontDistributionUrl;
    
    @Value("${media.processing.async.enabled:true}")
    private boolean asyncProcessingEnabled;
    
    // File size limits (configurable)
    @Value("${media.upload.video.max-size:524288000}") // 500MB default
    private long maxVideoSize;
    
    @Value("${media.upload.image.max-size:104857600}") // 100MB default
    private long maxImageSize;
    
    @Value("${media.upload.audio.max-size:209715200}") // 200MB default
    private long maxAudioSize;
    
    @Value("${media.upload.document.max-size:157286400}") // 150MB default
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
            
            // Create MediaFile record to track processing status
            // CRITICAL: Only track files that need processing/compression (posts, chat-media, etc.)
            // DO NOT track final images that should never be deleted:
            // - banner-images: User banner images (final, never compressed)
            // - banners: User banner images (alternative folder name used by frontend, final, never compressed)
            // - profile-pictures: User profile pictures (final, never compressed)
            // - organizations/logos: Organization logos (final, never compressed)
            // - prayer-requests: Prayer request images (final, never compressed)
            // These are final images that don't need optimization/processing, and shouldn't be
            // deleted by the cleanup service.
            MediaFile mediaFile = null;
            boolean isFinalImage = folder.equals("banner-images") || 
                                   folder.equals("banners") ||
                                   folder.equals("profile-pictures") || 
                                   folder.equals("organizations/logos") || 
                                   folder.equals("prayer-requests");
            if ((isImage || isVideo) && !isFinalImage) {
                mediaFile = createMediaFileRecord(
                    originalUrl,
                    file.getContentType(),
                    file.getOriginalFilename(),
                    fileBytes.length,
                    folder
                );
            }
            
            // Process in background if enabled and file type requires processing
            if (asyncProcessingEnabled && (isImage || isVideo) && mediaFile != null) {
                if (isImage) {
                    processImageAsync(fileForProcessing, mediaFile);
                } else if (isVideo) {
                    processVideoAsync(fileForProcessing, mediaFile);
                }
            }
            
            // Return original URL immediately (user can continue)
            return originalUrl;
            
        } catch (Exception e) {
            log.error("Error uploading file to S3 - bucket: {}, region: {}", bucketName, region, e);
            log.error("Exception details: {}", e.getMessage());
            
            // Provide more helpful error messages for common AWS credential issues
            String errorMessage = e.getMessage();
            if (errorMessage != null) {
                if (errorMessage.contains("Access Key Id") || errorMessage.contains("does not exist in our records")) {
                    throw new RuntimeException(
                        "AWS credentials are missing or invalid. Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables in Elastic Beanstalk.",
                        e
                    );
                } else if (errorMessage.contains("Access Denied") || errorMessage.contains("403")) {
                    throw new RuntimeException(
                        "AWS credentials do not have permission to access S3 bucket. Please check IAM permissions.",
                        e
                    );
                } else if (errorMessage.contains("NoSuchBucket")) {
                    throw new RuntimeException(
                        "S3 bucket does not exist: " + bucketName + ". Please check AWS_S3_BUCKET environment variable.",
                        e
                    );
                }
            }
            
            throw new RuntimeException("Failed to upload file: " + errorMessage, e);
        }
    }
    
    /**
     * Upload original file to S3 from bytes (synchronous, fast)
     */
    private String uploadOriginalFileFromBytes(byte[] fileBytes, String contentType, String originalFilename, String folder) {
        String fileExtension = getFileExtension(originalFilename);
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
        String key = "media/" + folder + "/originals/" + uniqueFilename;
        
        log.info("Uploading original file to S3: bucket={}, key={}, size={}", 
                bucketName, key, fileBytes.length);
        
        // Build metadata for video files to support iOS Safari playback
        // iOS Safari requires proper Cache-Control headers for Range request support
        boolean isVideo = contentType != null && contentType.startsWith("video/");
        
        PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength((long) fileBytes.length);
        
        // Add Cache-Control header for videos to support Range requests (iOS Safari requirement)
        // public: allows CDN caching
        // max-age=31536000: 1 year cache (videos don't change)
        // must-revalidate: ensures fresh content when needed
        if (isVideo) {
            requestBuilder.cacheControl("public, max-age=31536000, must-revalidate");
            log.info("Added Cache-Control header for video file: {}", key);
        }
        
        PutObjectRequest putObjectRequest = requestBuilder.build();
        
        s3Client.putObject(putObjectRequest, 
                RequestBody.fromInputStream(new ByteArrayInputStream(fileBytes), fileBytes.length));
        
        return generateAccessibleUrl(key);
    }
    
    /**
     * Create MediaFile record to track processing status
     */
    @Transactional
    private MediaFile createMediaFileRecord(String originalUrl, String contentType, 
                                           String originalFilename, long fileSize, String folder) {
        MediaFile mediaFile = new MediaFile();
        mediaFile.setOriginalUrl(originalUrl);
        mediaFile.setFileType(contentType.startsWith("image/") ? "image" : "video");
        mediaFile.setProcessingStatus(ProcessingStatus.PENDING);
        mediaFile.setOriginalSize(fileSize);
        mediaFile.setFolder(folder);
        mediaFile.setOriginalFilename(originalFilename);
        
        return mediaFileRepository.save(mediaFile);
    }
    
    /**
     * Process image asynchronously
     */
    private void processImageAsync(MultipartFile file, MediaFile mediaFile) {
        mediaProcessingExecutor.execute(() -> {
            try {
                log.info("Starting async image processing for: {}", mediaFile.getOriginalUrl());
                
                // Mark as processing
                updateMediaFileStatus(mediaFile.getId(), ProcessingStatus.PROCESSING);
                
                // Process image (file is already in memory)
                var result = imageProcessingService.processImage(file);
                
                // Upload optimized version
                String optimizedKey = "media/" + mediaFile.getFolder() + "/optimized/" + UUID.randomUUID() + ".jpg";
                uploadProcessedFile(result.getProcessedImageData(), optimizedKey, "image/jpeg");
                
                String optimizedUrl = generateAccessibleUrl(optimizedKey);
                double compressionRatio = result.getCompressionRatio();
                int reductionPercent = compressionRatio > 0 && compressionRatio <= 1.0 
                    ? (int) Math.round((1 - compressionRatio) * 100) 
                    : 0;
                log.info("Image processing completed: {} -> {} ({}% reduction)",
                        mediaFile.getOriginalUrl(), optimizedUrl, reductionPercent);
                
                // Update MediaFile with optimized URL and mark as completed
                markMediaFileCompleted(mediaFile.getId(), optimizedUrl, result.getProcessedImageData().length);
                
            } catch (Exception e) {
                log.error("Error processing image: {}", mediaFile.getOriginalUrl(), e);
                // Mark as failed and keep original
                markMediaFileFailed(mediaFile.getId(), e.getMessage());
            }
        });
    }
    
    /**
     * Process video asynchronously
     */
    private void processVideoAsync(MultipartFile file, MediaFile mediaFile) {
        mediaProcessingExecutor.execute(() -> {
            try {
                log.info("Starting MediaConvert job for video: {}", mediaFile.getOriginalUrl());
                
                // Mark as processing
                updateMediaFileStatus(mediaFile.getId(), ProcessingStatus.PROCESSING);
                
                // Extract S3 key from original URL
                String s3Key = extractS3KeyFromUrl(mediaFile.getOriginalUrl());
                
                // Start MediaConvert job (async - job processes in cloud)
                String jobId = mediaConvertVideoService.startVideoProcessingJob(mediaFile, s3Key);
                
                if (jobId == null) {
                    log.warn("MediaConvert not configured. Video optimization skipped for: {}", mediaFile.getOriginalUrl());
                    // Mark as completed with original URL (no optimization)
                    markMediaFileCompleted(mediaFile.getId(), mediaFile.getOriginalUrl(), 0L);
                    return;
                }
                
                // CRITICAL: Store job ID in MediaFile for webhook/polling to find it!
                mediaFileRepository.findById(mediaFile.getId()).ifPresent(mf -> {
                    mf.setJobId(jobId);
                    mediaFileRepository.save(mf);
                });
                
                log.info("MediaConvert job started: {} for video: {} (MediaFile ID: {})", 
                        jobId, mediaFile.getOriginalUrl(), mediaFile.getId());
                // Note: Job completion will be handled by MediaConvert webhook/notification
                // The MediaFile will be updated when the job completes
                
            } catch (Exception e) {
                log.error("Error processing video: {}", mediaFile.getOriginalUrl(), e);
                // Mark as failed and keep original
                markMediaFileFailed(mediaFile.getId(), e.getMessage());
            }
        });
    }
    
    /**
     * Update MediaFile processing status
     */
    @Transactional
    private void updateMediaFileStatus(UUID mediaFileId, ProcessingStatus status) {
        mediaFileRepository.findById(mediaFileId).ifPresent(mediaFile -> {
            mediaFile.markProcessingStarted();
            mediaFileRepository.save(mediaFile);
        });
    }
    
    /**
     * Mark MediaFile as completed with optimized URL
     */
    @Transactional
    private void markMediaFileCompleted(UUID mediaFileId, String optimizedUrl, long optimizedSize) {
        markMediaFileCompleted(mediaFileId, optimizedUrl, optimizedSize, null);
    }

    @Transactional
    private void markMediaFileCompleted(UUID mediaFileId, String optimizedUrl, long optimizedSize, String thumbnailUrl) {
        mediaFileRepository.findById(mediaFileId).ifPresent(mediaFile -> {
            mediaFile.markProcessingCompleted(optimizedUrl, optimizedSize, thumbnailUrl);
            mediaFileRepository.save(mediaFile);
        });
    }
    
    /**
     * Mark MediaFile as failed
     */
    @Transactional
    private void markMediaFileFailed(UUID mediaFileId, String errorMessage) {
        mediaFileRepository.findById(mediaFileId).ifPresent(mediaFile -> {
            mediaFile.markProcessingFailed(errorMessage);
            mediaFileRepository.save(mediaFile);
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
    
    /**
     * Extract S3 key from full S3 URL
     */
    private String extractS3KeyFromUrl(String url) {
        if (url.contains(bucketName)) {
            int keyStart = url.indexOf(bucketName) + bucketName.length() + 1;
            // Remove query parameters if present
            int queryStart = url.indexOf('?', keyStart);
            if (queryStart > 0) {
                return url.substring(keyStart, queryStart);
            }
            return url.substring(keyStart);
        }
        // If it's already a key, return as-is
        return url;
    }
    
    private String extractKeyFromUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("Invalid file URL: URL is null or empty");
        }
        
        // Handle CloudFront URLs first (e.g., https://d3loytcgioxpml.cloudfront.net/banner-images/originals/...)
        if (cloudFrontDistributionUrl != null && !cloudFrontDistributionUrl.trim().isEmpty()) {
            String baseUrl = cloudFrontDistributionUrl.trim();
            // Remove trailing slash if present
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            
            if (fileUrl.startsWith(baseUrl + "/") || fileUrl.startsWith(baseUrl)) {
                // Extract key by removing the CloudFront base URL
                String key = fileUrl.startsWith(baseUrl + "/") 
                    ? fileUrl.substring(baseUrl.length() + 1)
                    : fileUrl.substring(baseUrl.length());
                // Remove query parameters if present
                int queryIndex = key.indexOf('?');
                if (queryIndex > 0) {
                    key = key.substring(0, queryIndex);
                }
                return key;
            }
        }
        
        // Handle direct S3 URLs (e.g., https://bucket.s3.region.amazonaws.com/key)
        String s3UrlPattern = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
        if (fileUrl.startsWith(s3UrlPattern)) {
            String key = fileUrl.substring(s3UrlPattern.length());
            // Remove query parameters if present
            int queryIndex = key.indexOf('?');
            if (queryIndex > 0) {
                key = key.substring(0, queryIndex);
            }
            return key;
        }
        
        // Try alternative S3 URL format (s3-region instead of s3.region)
        String altS3UrlPattern = String.format("https://%s.s3-%s.amazonaws.com/", bucketName, region);
        if (fileUrl.startsWith(altS3UrlPattern)) {
            String key = fileUrl.substring(altS3UrlPattern.length());
            // Remove query parameters if present
            int queryIndex = key.indexOf('?');
            if (queryIndex > 0) {
                key = key.substring(0, queryIndex);
            }
            return key;
        }
        
        // If it's already just a key (no URL protocol), return as-is
        if (!fileUrl.contains("://")) {
            return fileUrl;
        }
        
        // Check if it's an external URL (e.g., Google OAuth profile images)
        // These shouldn't be deleted from S3 as they're hosted externally
        if (fileUrl.startsWith("https://lh3.googleusercontent.com") ||
            fileUrl.startsWith("https://www.google.com") ||
            (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"))) {
            // If we get here and it's not an S3/CloudFront URL, it's an external URL
            throw new IllegalArgumentException("Cannot delete external URL (not an S3/CloudFront URL): " + fileUrl);
        }
        
        throw new IllegalArgumentException("URL format not recognized: " + fileUrl);
    }
    
    /**
     * Generate an accessible URL for the uploaded file.
     * Uses CloudFront CDN if configured (faster delivery, better for videos),
     * otherwise falls back to direct S3 URL.
     * 
     * CloudFront provides:
     * - Edge caching for faster delivery
     * - Better HTTP/2 support
     * - Optimized range request handling for video streaming
     * - Lower latency worldwide
     */
    public String generateAccessibleUrl(String key) {
        try {
            // Use CloudFront CDN if configured (preferred for performance)
            if (cloudFrontDistributionUrl != null && !cloudFrontDistributionUrl.trim().isEmpty()) {
                // Remove trailing slash if present
                String baseUrl = cloudFrontDistributionUrl.trim();
                if (baseUrl.endsWith("/")) {
                    baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
                }
                String cloudFrontUrl = baseUrl + "/" + key;
                log.info("✅ Using CloudFront URL for key {}: {}", key, cloudFrontUrl);
                return cloudFrontUrl;
            }
            
            // Fallback to direct S3 URL if CloudFront not configured
            String s3Url = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
            log.warn("⚠️ CloudFront not configured! Using direct S3 URL for key {}: {}", key, s3Url);
            return s3Url;
            
        } catch (Exception e) {
            log.error("❌ Error generating accessible URL for key: {}", key, e);
            // Fallback to direct S3 URL format
            String s3Url = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, key);
            log.warn("⚠️ Fallback to S3 URL: {}", s3Url);
            return s3Url;
        }
    }
    
    /**
     * Generate presigned PUT URL for direct S3 upload (Facebook/X approach)
     * Validates file size and type BEFORE generating URL (safety net)
     * 
     * @param fileName Original file name
     * @param contentType MIME type (e.g., "video/mp4", "image/jpeg")
     * @param fileSize File size in bytes
     * @param folder S3 folder (e.g., "posts", "chat-media", "resources")
     * @return PresignedUploadResponse with presigned URL and S3 key
     */
    public com.churchapp.dto.PresignedUploadResponse generatePresignedUploadUrl(
            String fileName, String contentType, Long fileSize, String folder) {
        
        // Validate file size and type BEFORE generating URL (safety net)
        validateFileSizeAndType(contentType, fileSize);
        
        // Generate unique S3 key
        String fileExtension = getFileExtension(fileName);
        String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
        String s3Key = "media/" + folder + "/originals/" + uniqueFilename;
        
        // Generate final URL (for after upload) - use generateAccessibleUrl to ensure CloudFront if configured
        // This ensures consistency - the URL returned here should match what handleUploadCompletion returns
        String finalUrl = generateAccessibleUrl(s3Key);
        
        // Build PutObjectRequest for presigned URL
        // CRITICAL: Only include headers that the client will send in the upload request
        // The presigned URL signature must match EXACTLY what the client sends
        // Do NOT include Cache-Control here - it's not sent by the client, so it would cause signature mismatch
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(contentType)
                .contentLength(fileSize)
                .build();
        
        // Note: Cache-Control will be set AFTER upload via S3 metadata update if needed
        // But for presigned URLs, we can't include it in the signature because the client doesn't send it
        
        // Generate presigned PUT URL (valid for 1 hour)
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .putObjectRequest(putObjectRequest)
                .build();
        
        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        String presignedUrl = presignedRequest.url().toString();
        
        log.info("Generated presigned URL for upload: key={}, size={}, type={}", s3Key, fileSize, contentType);
        
        return com.churchapp.dto.PresignedUploadResponse.success(
                presignedUrl, 
                s3Key, 
                finalUrl,
                3600L // 1 hour in seconds
        );
    }
    
    /**
     * Validate file size and type (used before generating presigned URL)
     * This is the safety net that prevents large/unauthorized uploads
     */
    private void validateFileSizeAndType(String contentType, Long fileSize) {
        if (fileSize == null || fileSize <= 0) {
            throw new IllegalArgumentException("File size must be positive");
        }
        
        if (contentType == null || contentType.trim().isEmpty()) {
            throw new IllegalArgumentException("Content type is required");
        }
        
        // Check file type first
        if (!isAllowedFileType(contentType)) {
            throw new IllegalArgumentException(
                "File type not supported. Allowed types: images (JPEG, PNG, GIF, WebP, HEIC, HEIF), " +
                "videos (MP4, WebM, MOV), audio (MP3, WAV, OGG), documents (PDF, DOC, DOCX, TXT)"
            );
        }
        
        // Check file size by type
        if (contentType.startsWith("video/")) {
            if (fileSize > maxVideoSize) {
                throw new IllegalArgumentException(
                    String.format("Video file size (%.2f MB) exceeds maximum limit of %.2f MB", 
                        fileSize / (1024.0 * 1024.0), maxVideoSize / (1024.0 * 1024.0))
                );
            }
        } else if (contentType.startsWith("image/")) {
            if (fileSize > maxImageSize) {
                throw new IllegalArgumentException(
                    String.format("Image file size (%.2f MB) exceeds maximum limit of %.2f MB", 
                        fileSize / (1024.0 * 1024.0), maxImageSize / (1024.0 * 1024.0))
                );
            }
        } else if (contentType.startsWith("audio/")) {
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
    }
    
    /**
     * Handle upload completion after client uploads directly to S3
     * Verifies file exists, creates MediaFile record, and starts processing if needed
     * 
     * @param s3Key S3 key of the uploaded file
     * @param fileName Original file name
     * @param contentType MIME type
     * @param fileSize File size in bytes
     * @param folder S3 folder
     * @return Final accessible URL
     */
    @Transactional
    public String handleUploadCompletion(String s3Key, String fileName, String contentType, Long fileSize, String folder) {
        try {
            // Verify file exists in S3 (basic check)
            // Note: We could do a more thorough check here, but for now we trust the client
            // In production, you might want to verify the file actually exists
            
            String fileUrl = generateAccessibleUrl(s3Key);
            log.info("✅ Handling upload completion: key={}, url={} (CloudFront configured: {})", 
                    s3Key, fileUrl, cloudFrontDistributionUrl != null && !cloudFrontDistributionUrl.trim().isEmpty());
            
            boolean isImage = contentType != null && contentType.startsWith("image/");
            boolean isVideo = contentType != null && contentType.startsWith("video/");
            
            // Update Cache-Control metadata for videos (iOS Safari requirement for Range requests)
            // This must be done AFTER upload because presigned URLs can't include it in signature
            if (isVideo) {
                updateVideoCacheControl(s3Key, contentType);
            }
            
            // CRITICAL: Only track files that need processing/compression (posts, chat-media, etc.)
            // DO NOT track final images that should never be deleted:
            // - banner-images: User banner images (final, never compressed)
            // - banners: User banner images (alternative folder name, final, never compressed)
            // - profile-pictures: User profile pictures (final, never compressed)
            // - organizations/logos: Organization logos (final, never compressed)
            // - prayer-requests: Prayer request images (final, never compressed)
            // These are final images that don't need optimization/processing, and shouldn't be
            // deleted by the cleanup service.
            boolean isFinalImage = folder.equals("banner-images") || 
                                   folder.equals("banners") ||
                                   folder.equals("profile-pictures") || 
                                   folder.equals("organizations/logos") || 
                                   folder.equals("prayer-requests");
            
            // Create MediaFile record for images/videos (for processing tracking)
            // BUT SKIP final images - they should never be tracked or deleted!
            MediaFile mediaFile = null;
            if ((isImage || isVideo) && !isFinalImage) {
                mediaFile = createMediaFileRecord(
                        fileUrl,
                        contentType,
                        fileName,
                        fileSize,
                        folder
                );
                
                // Start async processing if enabled
                if (asyncProcessingEnabled) {
                    // For direct S3 uploads, we need to download the file to process it
                    // This is done asynchronously to not block the response
                    if (isImage) {
                        processImageFromS3Async(s3Key, mediaFile, contentType);
                    } else if (isVideo) {
                        processVideoFromS3Async(s3Key, mediaFile);
                    }
                }
            } else if (isFinalImage) {
                log.info("✅ Skipping MediaFile tracking for final image in folder '{}' - these should never be deleted", folder);
            }
            
            return fileUrl;
            
        } catch (Exception e) {
            log.error("Error handling upload completion for key: {}", s3Key, e);
            throw new RuntimeException("Failed to complete upload: " + e.getMessage(), e);
        }
    }
    
    /**
     * Process image from S3 (downloads, processes, uploads optimized version)
     */
    private void processImageFromS3Async(String s3Key, MediaFile mediaFile, String contentType) {
        mediaProcessingExecutor.execute(() -> {
            try {
                log.info("Starting async image processing from S3: {}", s3Key);
                
                // Mark as processing
                updateMediaFileStatus(mediaFile.getId(), ProcessingStatus.PROCESSING);
                
                // Download file from S3
                GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(s3Key)
                        .build();
                
                byte[] fileBytes = s3Client.getObjectAsBytes(getObjectRequest).asByteArray();
                
                // Create MultipartFile from bytes for processing
                MultipartFile file = new InMemoryMultipartFile(
                        mediaFile.getOriginalFilename(),
                        contentType,
                        fileBytes
                );
                
                // Process image
                var result = imageProcessingService.processImage(file);
                
                // Upload optimized version
                String optimizedKey = "media/" + mediaFile.getFolder() + "/optimized/" + UUID.randomUUID() + ".jpg";
                uploadProcessedFile(result.getProcessedImageData(), optimizedKey, "image/jpeg");
                
                String optimizedUrl = generateAccessibleUrl(optimizedKey);
                double compressionRatio = result.getCompressionRatio();
                int reductionPercent = compressionRatio > 0 && compressionRatio <= 1.0 
                    ? (int) Math.round((1 - compressionRatio) * 100) 
                    : 0;
                
                log.info("Image processing completed: {} -> {} ({}% reduction)",
                        mediaFile.getOriginalUrl(), optimizedUrl, reductionPercent);
                
                // Update MediaFile with optimized URL
                markMediaFileCompleted(mediaFile.getId(), optimizedUrl, result.getProcessedImageData().length);
                
            } catch (Exception e) {
                log.error("Error processing image from S3: {}", s3Key, e);
                markMediaFileFailed(mediaFile.getId(), e.getMessage());
            }
        });
    }
    
    /**
     * Process video from S3 (starts MediaConvert job)
     */
    private void processVideoFromS3Async(String s3Key, MediaFile mediaFile) {
        mediaProcessingExecutor.execute(() -> {
            try {
                log.info("Starting MediaConvert job for video from S3: {}", s3Key);
                
                // Mark as processing
                updateMediaFileStatus(mediaFile.getId(), ProcessingStatus.PROCESSING);
                
                // Start MediaConvert job
                String jobId = mediaConvertVideoService.startVideoProcessingJob(mediaFile, s3Key);
                
                if (jobId == null) {
                    log.warn("MediaConvert not configured. Video optimization skipped for: {}", s3Key);
                    // Mark as completed with original URL (no optimization)
                    markMediaFileCompleted(mediaFile.getId(), mediaFile.getOriginalUrl(), 0L);
                    return;
                }
                
                // Store job ID in MediaFile for polling
                mediaFileRepository.findById(mediaFile.getId()).ifPresent(mf -> {
                    mf.setJobId(jobId);
                    mediaFileRepository.save(mf);
                });
                
                log.info("MediaConvert job started: {} for video: {} (MediaFile ID: {})", 
                        jobId, mediaFile.getOriginalUrl(), mediaFile.getId());
                
            } catch (Exception e) {
                log.error("Error processing video from S3: {}", s3Key, e);
                markMediaFileFailed(mediaFile.getId(), e.getMessage());
            }
        });
    }
    
    /**
     * Update Cache-Control metadata for video files after upload
     * This is needed for iOS Safari Range request support
     * Uses CopyObject to copy the object to itself with new metadata
     * 
     * @param s3Key S3 key of the uploaded video file
     * @param contentType MIME type of the video
     */
    private void updateVideoCacheControl(String s3Key, String contentType) {
        try {
            // Build source and destination (same object - copying to itself)
            // CopySource format: "bucket/key" (URL-encoded if needed)
            String copySource = String.format("%s/%s", bucketName, s3Key);
            
            // Copy object to itself with updated Cache-Control metadata
            // This is the standard way to update S3 object metadata
            CopyObjectRequest copyRequest = CopyObjectRequest.builder()
                    .destinationBucket(bucketName)
                    .copySource(copySource)
                    .destinationKey(s3Key)
                    .contentType(contentType)
                    .cacheControl("public, max-age=31536000, must-revalidate")
                    .metadataDirective(software.amazon.awssdk.services.s3.model.MetadataDirective.REPLACE)
                    .build();
            
            s3Client.copyObject(copyRequest);
            log.info("✅ Updated Cache-Control metadata for video: {}", s3Key);
            
        } catch (Exception e) {
            // Log error but don't fail the upload - Cache-Control is nice-to-have, not critical
            log.warn("⚠️ Failed to update Cache-Control metadata for video {}: {}", s3Key, e.getMessage());
            // Don't throw - upload should still succeed even if metadata update fails
        }
    }
}
