package com.churchapp.entity;

import com.churchapp.dto.ProcessingStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity to track media file processing status
 * Tracks original and optimized URLs, processing status, and file metadata
 */
@Entity
@Table(name = "media_files", indexes = {
    @Index(name = "idx_media_files_status", columnList = "processing_status"),
    @Index(name = "idx_media_files_created_at", columnList = "created_at"),
    @Index(name = "idx_media_files_file_type", columnList = "file_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaFile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    /**
     * Original file URL (stored in S3 /originals/ folder)
     * This is the file uploaded by the user before processing
     */
    @Column(name = "original_url", nullable = false, length = 500)
    private String originalUrl;
    
    /**
     * Optimized file URL (stored in S3 /optimized/ folder)
     * This is the processed/compressed version
     * Null until processing completes
     */
    @Column(name = "optimized_url", length = 500)
    private String optimizedUrl;

    /**
     * Thumbnail URL (stored in S3 /thumbnails/ folder)
     * This is a JPEG image extracted from the first frame of videos
     * Null until thumbnail generation completes (only for videos)
     */
    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;
    
    /**
     * Type of media file: 'image' or 'video'
     */
    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType; // 'image' or 'video'
    
    /**
     * Processing status: PENDING, PROCESSING, COMPLETED, FAILED
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 20)
    private ProcessingStatus processingStatus = ProcessingStatus.PENDING;
    
    /**
     * Original file size in bytes
     */
    @Column(name = "original_size", nullable = false)
    private Long originalSize;
    
    /**
     * Optimized file size in bytes
     * Null until processing completes
     */
    @Column(name = "optimized_size")
    private Long optimizedSize;
    
    /**
     * When processing started
     */
    @Column(name = "processing_started_at")
    private LocalDateTime processingStartedAt;
    
    /**
     * When processing completed (successfully or failed)
     */
    @Column(name = "processing_completed_at")
    private LocalDateTime processingCompletedAt;
    
    /**
     * Error message if processing failed
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    /**
     * Number of retry attempts for failed processing
     */
    @Column(name = "retry_count", nullable = false)
    private Integer retryCount = 0;
    
    /**
     * Maximum retry attempts (default: 3)
     */
    @Column(name = "max_retries", nullable = false)
    private Integer maxRetries = 3;
    
    /**
     * S3 folder where file is stored (e.g., 'posts', 'chat-media', 'profile-pics')
     */
    @Column(name = "folder", nullable = false, length = 100)
    private String folder;
    
    /**
     * Original filename
     */
    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    /**
     * MediaConvert job ID (for video processing)
     * Used to poll job status and extract thumbnail URLs
     */
    @Column(name = "job_id", length = 100)
    private String jobId;

    /**
     * Expected S3 key for optimized output (e.g., media/posts/optimized/uuid_optimized.mp4)
     * Stored when MediaConvert job starts so webhook knows exactly where output will be
     */
    @Column(name = "expected_optimized_key", length = 500)
    private String expectedOptimizedKey;

    /**
     * Expected S3 key for thumbnail (e.g., media/posts/thumbnails/uuid.0000000.jpg)
     * Stored when MediaConvert job starts so webhook knows exactly where thumbnail will be
     */
    @Column(name = "expected_thumbnail_key", length = 500)
    private String expectedThumbnailKey;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    /**
     * Calculate compression ratio (0.0 to 1.0)
     * Returns null if not yet processed
     */
    public Double getCompressionRatio() {
        if (optimizedSize == null || originalSize == null || originalSize == 0) {
            return null;
        }
        return (double) optimizedSize / originalSize;
    }
    
    /**
     * Calculate reduction percentage (0 to 100)
     * Returns null if not yet processed
     */
    public Double getReductionPercent() {
        Double ratio = getCompressionRatio();
        if (ratio == null) {
            return null;
        }
        return (1.0 - ratio) * 100.0;
    }
    
    /**
     * Check if processing can be retried
     */
    public boolean canRetry() {
        return processingStatus == ProcessingStatus.FAILED && retryCount < maxRetries;
    }
    
    /**
     * Mark processing as started
     */
    public void markProcessingStarted() {
        this.processingStatus = ProcessingStatus.PROCESSING;
        this.processingStartedAt = LocalDateTime.now();
    }
    
    /**
     * Mark processing as completed successfully
     */
    public void markProcessingCompleted(String optimizedUrl, Long optimizedSize) {
        markProcessingCompleted(optimizedUrl, optimizedSize, null);
    }

    /**
     * Mark processing as completed successfully with thumbnail URL
     */
    public void markProcessingCompleted(String optimizedUrl, Long optimizedSize, String thumbnailUrl) {
        this.processingStatus = ProcessingStatus.COMPLETED;
        this.optimizedUrl = optimizedUrl;
        this.optimizedSize = optimizedSize;
        this.thumbnailUrl = thumbnailUrl;
        this.processingCompletedAt = LocalDateTime.now();
        this.errorMessage = null;
    }
    
    /**
     * Mark processing as failed
     */
    public void markProcessingFailed(String errorMessage) {
        this.processingStatus = ProcessingStatus.FAILED;
        this.processingCompletedAt = LocalDateTime.now();
        this.errorMessage = errorMessage;
        this.retryCount++;
    }
}

