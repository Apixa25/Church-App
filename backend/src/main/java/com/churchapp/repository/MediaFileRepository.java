package com.churchapp.repository;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MediaFileRepository extends JpaRepository<MediaFile, UUID> {
    
    /**
     * Find media file by original URL
     */
    Optional<MediaFile> findByOriginalUrl(String originalUrl);
    
    /**
     * Find media file by optimized URL
     */
    Optional<MediaFile> findByOptimizedUrl(String optimizedUrl);
    
    /**
     * Find all media files with a specific processing status
     */
    List<MediaFile> findByProcessingStatus(ProcessingStatus status);
    
    /**
     * Find all media files that are ready for cleanup
     * (completed processing, created more than retention hours ago)
     */
    @Query("SELECT m FROM MediaFile m WHERE m.processingStatus = :status " +
           "AND m.processingCompletedAt < :cutoffTime " +
           "AND m.optimizedUrl IS NOT NULL")
    List<MediaFile> findReadyForCleanup(
        @Param("status") ProcessingStatus status,
        @Param("cutoffTime") LocalDateTime cutoffTime
    );
    
    /**
     * Find failed processing jobs that can be retried
     */
    @Query("SELECT m FROM MediaFile m WHERE m.processingStatus = :status " +
           "AND m.retryCount < m.maxRetries")
    List<MediaFile> findFailedProcessingRetryable(@Param("status") ProcessingStatus status);
    
    /**
     * Find media files by folder
     */
    List<MediaFile> findByFolder(String folder);
    
    /**
     * Find media files by file type
     */
    List<MediaFile> findByFileType(String fileType);
    
    /**
     * Count media files by processing status
     */
    long countByProcessingStatus(ProcessingStatus status);
}

