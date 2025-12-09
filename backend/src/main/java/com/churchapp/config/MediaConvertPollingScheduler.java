package com.churchapp.config;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.*;

import java.util.List;

/**
 * FALLBACK polling scheduler for MediaConvert job completion.
 * 
 * ⚠️  THIS IS NOT THE PREFERRED APPROACH! ⚠️
 * 
 * The industry-standard approach is to use EventBridge + SNS webhooks:
 * - EventBridge captures MediaConvert job state changes
 * - SNS sends webhook to /api/media/webhook/mediaconvert
 * - Database updated in real-time with zero polling
 * 
 * This polling scheduler is DISABLED BY DEFAULT and should only be enabled
 * as a temporary fallback if SNS webhooks aren't working.
 * 
 * To enable: Set environment variable MEDIACONVERT_POLLING_ENABLED=true
 * 
 * At scale (1M+ users), polling would cause:
 * - Thousands of unnecessary API calls per minute
 * - Increased AWS costs
 * - Server resource waste
 * - Up to 30 seconds latency
 * 
 * CONFIGURE SNS PROPERLY INSTEAD!
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "mediaconvert.polling.enabled", havingValue = "true", matchIfMissing = false)
public class MediaConvertPollingScheduler {

    private final MediaFileRepository mediaFileRepository;
    private final MediaConvertClient mediaConvertClient;
    
    @Value("${aws.s3.bucket-name}")
    private String bucketName;
    
    @Value("${aws.region:us-west-2}")
    private String region;
    
    @Value("${aws.cloudfront.distribution-url:}")
    private String cloudFrontUrl;

    /**
     * Poll MediaConvert every 30 seconds for completed jobs.
     * 
     * ⚠️ FALLBACK ONLY - Use SNS webhooks in production!
     */
    @Scheduled(fixedRate = 30000) // Every 30 seconds
    @Transactional
    public void pollMediaConvertJobs() {
        log.warn("⚠️ Using polling fallback for MediaConvert - configure SNS webhooks for production!");
        try {
            // Find all MediaFiles in PROCESSING status with a job ID
            List<MediaFile> processingFiles = mediaFileRepository
                    .findByProcessingStatusAndJobIdIsNotNull(ProcessingStatus.PROCESSING);
            
            if (processingFiles.isEmpty()) {
                return; // Nothing to poll
            }
            
            log.info("🔄 Polling {} MediaConvert jobs for completion", processingFiles.size());
            
            for (MediaFile mediaFile : processingFiles) {
                try {
                    checkAndUpdateJobStatus(mediaFile);
                } catch (Exception e) {
                    log.error("Error polling job {} for MediaFile {}: {}", 
                            mediaFile.getJobId(), mediaFile.getId(), e.getMessage());
                }
            }
            
        } catch (Exception e) {
            log.error("Error in MediaConvert polling scheduler: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Check job status and update MediaFile if completed
     */
    private void checkAndUpdateJobStatus(MediaFile mediaFile) {
        String jobId = mediaFile.getJobId();
        
        try {
            GetJobRequest request = GetJobRequest.builder()
                    .id(jobId)
                    .build();
            
            GetJobResponse response = mediaConvertClient.getJob(request);
            Job job = response.job();
            JobStatus status = job.status();
            
            if (status == JobStatus.COMPLETE) {
                // Job completed! Extract the optimized URL
                String optimizedUrl = extractOptimizedUrl(job, mediaFile);
                
                if (optimizedUrl != null) {
                    mediaFile.markProcessingCompleted(optimizedUrl, 0L, null);
                    mediaFileRepository.save(mediaFile);
                    log.info("✅ MediaConvert job {} completed! Updated MediaFile {} with optimized URL: {}", 
                            jobId, mediaFile.getId(), optimizedUrl);
                } else {
                    log.warn("Job {} completed but couldn't extract optimized URL for MediaFile {}", 
                            jobId, mediaFile.getId());
                }
                
            } else if (status == JobStatus.ERROR || status == JobStatus.CANCELED) {
                // Job failed
                String errorMessage = job.errorMessage() != null ? job.errorMessage() : "Unknown error";
                mediaFile.markProcessingFailed(errorMessage);
                mediaFileRepository.save(mediaFile);
                log.error("❌ MediaConvert job {} failed for MediaFile {}: {}", 
                        jobId, mediaFile.getId(), errorMessage);
                
            } else {
                // Job still in progress (SUBMITTED, PROGRESSING)
                log.debug("Job {} still in status: {}", jobId, status);
            }
            
        } catch (NotFoundException e) {
            log.error("Job {} not found in MediaConvert for MediaFile {}", jobId, mediaFile.getId());
            mediaFile.markProcessingFailed("Job not found in MediaConvert");
            mediaFileRepository.save(mediaFile);
        }
    }
    
    /**
     * Extract the optimized video URL from a completed MediaConvert job
     */
    private String extractOptimizedUrl(Job job, MediaFile mediaFile) {
        try {
            // Get output group details
            List<OutputGroupDetail> outputGroups = job.outputGroupDetails();
            if (outputGroups == null || outputGroups.isEmpty()) {
                log.warn("No output groups in completed job {}", job.id());
                return null;
            }
            
            // The first output group is the video (MP4)
            // We need to construct the URL from the destination + input filename
            // MediaConvert output follows pattern: destination + inputFileName (without extension) + ".mp4"
            
            // Get the input file key
            String inputUri = job.settings().inputs().get(0).fileInput();
            // s3://bucket/posts/originals/uuid.webm -> uuid
            String inputFileName = inputUri.substring(inputUri.lastIndexOf("/") + 1);
            String baseFileName = inputFileName.substring(0, inputFileName.lastIndexOf("."));
            
            // Get destination from first output group
            String destination = job.settings().outputGroups().get(0)
                    .outputGroupSettings().fileGroupSettings().destination();
            // s3://bucket/posts/optimized/ -> posts/optimized/
            String s3Key = destination.replace("s3://" + bucketName + "/", "") + baseFileName + ".mp4";
            
            // Construct accessible URL (prefer CloudFront if available)
            String optimizedUrl;
            if (cloudFrontUrl != null && !cloudFrontUrl.isEmpty()) {
                optimizedUrl = cloudFrontUrl + "/" + s3Key;
            } else {
                optimizedUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
            }
            
            log.info("Extracted optimized URL for job {}: {}", job.id(), optimizedUrl);
            return optimizedUrl;
            
        } catch (Exception e) {
            log.error("Error extracting optimized URL from job {}: {}", job.id(), e.getMessage());
            return null;
        }
    }
}

