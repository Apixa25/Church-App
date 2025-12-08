package com.churchapp.config;

import com.churchapp.dto.ProcessingStatus;
import com.churchapp.entity.MediaFile;
import com.churchapp.repository.MediaFileRepository;
import com.churchapp.service.MediaConvertVideoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Scheduled task to poll MediaConvert jobs for completion status.
 * 
 * This checks for videos that are in PROCESSING status and have a jobId,
 * then queries MediaConvert to see if the job has completed.
 * 
 * When a job completes:
 * - Extracts the thumbnail URL from the job output
 * - Updates the MediaFile with optimized URL and thumbnail URL
 * - Marks the MediaFile as COMPLETED
 * 
 * Schedule: Runs every 2 minutes to check for completed jobs
 * Cron: "0 */2 * * * *" = Every 2 minutes
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MediaConvertJobPollingScheduler {

    private final MediaFileRepository mediaFileRepository;
    private final MediaConvertVideoService mediaConvertVideoService;

    /**
     * Poll MediaConvert for completed video processing jobs
     * Runs every 2 minutes
     * 
     * Cron format: second, minute, hour, day, month, weekday
     * "0 */2 * * * *" = Every 2 minutes
     */
    @Scheduled(cron = "0 */2 * * * *")
    @Transactional
    public void pollMediaConvertJobs() {
        try {
            // Find all MediaFiles that are processing and have a jobId
            List<MediaFile> processingVideos = mediaFileRepository.findByProcessingStatusAndJobIdIsNotNull(
                    ProcessingStatus.PROCESSING);

            if (processingVideos.isEmpty()) {
                log.debug("No processing videos with job IDs found. Skipping polling cycle.");
                return;
            }

            log.info("Polling {} MediaConvert jobs for completion status", processingVideos.size());

            int completedCount = 0;
            int failedCount = 0;

            for (MediaFile mediaFile : processingVideos) {
                try {
                    String jobId = mediaFile.getJobId();
                    if (jobId == null || jobId.trim().isEmpty()) {
                        continue; // Skip if no job ID
                    }

                    // Get job status from MediaConvert
                    var job = mediaConvertVideoService.getJobStatus(jobId);
                    if (job == null) {
                        log.warn("Job not found: {} for MediaFile: {}", jobId, mediaFile.getId());
                        continue;
                    }

                    String jobStatus = job.statusAsString();
                    log.debug("Job {} status: {} for MediaFile: {}", jobId, jobStatus, mediaFile.getId());

                    // Check if job is complete
                    if ("COMPLETE".equals(jobStatus)) {
                        // Extract optimized video URL
                        String optimizedUrl = extractOptimizedVideoUrl(job, mediaFile);
                        
                        // Extract thumbnail URL
                        String thumbnailUrl = mediaConvertVideoService.extractThumbnailUrl(job, mediaFile);
                        
                        // Update MediaFile
                        mediaFile.markProcessingCompleted(
                                optimizedUrl != null ? optimizedUrl : mediaFile.getOriginalUrl(),
                                0L, // Size will be updated later if needed
                                thumbnailUrl
                        );
                        mediaFileRepository.save(mediaFile);

                        log.info("MediaConvert job completed: {} for MediaFile: {}. Thumbnail: {}",
                                jobId, mediaFile.getId(), thumbnailUrl != null ? "generated" : "not found");
                        completedCount++;

                    } else if ("ERROR".equals(jobStatus) || "CANCELED".equals(jobStatus)) {
                        // Job failed or was canceled
                        String errorMessage = job.errorMessage() != null 
                                ? job.errorMessage() 
                                : "MediaConvert job " + jobStatus.toLowerCase();
                        
                        mediaFile.markProcessingFailed(errorMessage);
                        mediaFileRepository.save(mediaFile);

                        log.warn("MediaConvert job {} failed: {} for MediaFile: {}",
                                jobId, errorMessage, mediaFile.getId());
                        failedCount++;
                    }
                    // If status is "SUBMITTED" or "PROGRESSING", job is still running - do nothing

                } catch (Exception e) {
                    log.error("Error polling MediaConvert job for MediaFile: {}", mediaFile.getId(), e);
                    // Continue with next job
                }
            }

            if (completedCount > 0 || failedCount > 0) {
                log.info("MediaConvert polling cycle completed. Completed: {}, Failed: {}, Still processing: {}",
                        completedCount, failedCount, processingVideos.size() - completedCount - failedCount);
            }

        } catch (Exception e) {
            log.error("Error during MediaConvert job polling cycle", e);
        }
    }

    /**
     * Extract optimized video URL from completed MediaConvert job
     */
    private String extractOptimizedVideoUrl(software.amazon.awssdk.services.mediaconvert.model.Job job, MediaFile mediaFile) {
        try {
            // Get job outputs
            var outputGroups = job.outputGroupDetails();
            if (outputGroups == null || outputGroups.isEmpty()) {
                log.warn("No output groups found in job: {}", job.id());
                return null;
            }

            // Find the optimized video output (contains "_optimized" in output file names)
            for (var outputGroup : outputGroups) {
                var outputs = outputGroup.outputDetails();
                if (outputs == null) continue;

                // In AWS SDK v2, OutputDetail structure is different
                // For now, construct URL from destination + known pattern
                // The optimized video will be in the destination with _optimized modifier
                String destination = fileGroupSettings.destination();
                if (destination != null && destination.contains("optimized")) {
                    // Convert S3 URI to accessible URL
                    return convertS3UriToUrl(destination);
                }
            }

            // If no optimized output found, return original URL
            log.warn("Optimized video output not found in job: {}. Using original URL.", job.id());
            return mediaFile.getOriginalUrl();

        } catch (Exception e) {
            log.error("Error extracting optimized video URL from job: {}", job.id(), e);
            return mediaFile.getOriginalUrl(); // Fallback to original
        }
    }

    /**
     * Convert S3 URI to accessible HTTPS URL
     */
    private String convertS3UriToUrl(String s3Uri) {
        if (s3Uri == null || !s3Uri.startsWith("s3://")) {
            return s3Uri;
        }

        // Remove s3:// prefix
        String path = s3Uri.substring(5);
        
        // Split bucket and key
        int firstSlash = path.indexOf('/');
        if (firstSlash == -1) {
            return s3Uri; // Invalid format
        }

        String bucket = path.substring(0, firstSlash);
        String key = path.substring(firstSlash + 1);
        
        // Extract region from MediaConvertVideoService or use default
        String region = System.getenv("AWS_REGION");
        if (region == null || region.isEmpty()) {
            region = "us-west-2"; // Default region
        }
        
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }
}

