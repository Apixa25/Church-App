package com.churchapp.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadService {
    
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region}")
    private String region;
    
    public String uploadFile(MultipartFile file, String folder) {
        try {
            // Validate file
            validateFile(file);
            
            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = getFileExtension(originalFilename);
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            String key = folder + "/" + uniqueFilename;
            
            log.info("Attempting to upload file to S3: bucket={}, region={}, key={}", bucketName, region, key);
            
            // Upload to S3 (without ACL since bucket doesn't allow ACLs)
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    // Removed ACL since bucket doesn't allow it - public access controlled by bucket policy
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            
            // Return either public URL or pre-signed URL based on configuration
            String fileUrl = generateAccessibleUrl(key);
            log.info("File uploaded successfully: {}", fileUrl);
            
            return fileUrl;
            
        } catch (Exception e) {
            log.error("Error uploading file to S3 - bucket: {}, region: {}", bucketName, region, e);
            log.error("Exception details: {}", e.getMessage());
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
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
        
        // Check file size (10MB limit)
        long maxSize = 10 * 1024 * 1024; // 10MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 10MB");
        }
        
        // Check file type - allow images, videos, audio, and documents
        String contentType = file.getContentType();
        if (contentType == null || !isAllowedFileType(contentType)) {
            throw new IllegalArgumentException("File type not supported. Allowed types: images (JPEG, PNG, GIF, WebP), videos (MP4, WebM), audio (MP3, WAV, OGG), documents (PDF, DOC, DOCX, TXT)");
        }
    }
    
    private boolean isAllowedFileType(String contentType) {
        // Images
        if (contentType.equals("image/jpeg") || contentType.equals("image/jpg") ||
            contentType.equals("image/png") || contentType.equals("image/gif") ||
            contentType.equals("image/webp")) {
            return true;
        }
        
        // Videos
        if (contentType.equals("video/mp4") || contentType.equals("video/webm")) {
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