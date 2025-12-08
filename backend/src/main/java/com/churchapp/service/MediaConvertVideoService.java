package com.churchapp.service;

import com.churchapp.entity.MediaFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.*;

import java.util.List;
import java.util.UUID;

/**
 * Service for processing videos using AWS MediaConvert
 * Implements cloud-native video processing similar to X.com/Twitter approach
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MediaConvertVideoService {

    private final MediaConvertClient mediaConvertClient;

    @Value("${aws.region:us-west-2}")
    private String region;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${media.video.target-width:854}")
    private int targetWidth;

    @Value("${media.video.target-height:480}")
    private int targetHeight;

    @Value("${media.video.bitrate:1000}")
    private int videoBitrate; // kbps

    @Value("${media.video.audio-bitrate:128}")
    private int audioBitrate; // kbps

    @Value("${media.video.frame-rate:30}")
    private int frameRate;

    @Value("${media.video.max-duration-seconds:30}")
    private int maxDurationSeconds;

    @Value("${aws.account-id:}")
    private String awsAccountId;

    /**
     * Start a MediaConvert job to process a video
     * This is async - the job will process in the cloud and notify via SNS when complete
     * 
     * @param mediaFile The MediaFile entity tracking this video
     * @param s3InputKey S3 key of the original video file
     * @return MediaConvert job ID
     */
    public String startVideoProcessingJob(MediaFile mediaFile, String s3InputKey) {
        try {
            // Check if MediaConvert is configured
            String roleArn = getMediaConvertRoleArn();
            if (roleArn == null) {
                log.warn("MediaConvert not configured. Skipping video optimization for: {}", s3InputKey);
                return null; // Return null to indicate processing was skipped
            }
            
            log.info("Starting MediaConvert job for video: {} (MediaFile ID: {})", s3InputKey, mediaFile.getId());

            // Extract S3 key from original URL if full URL provided
            String inputKey = extractS3KeyFromUrl(s3InputKey);
            String outputKey = generateOutputKey(mediaFile);
            String thumbnailKey = generateThumbnailKey(mediaFile);

            // Build S3 URIs
            String inputUri = String.format("s3://%s/%s", bucketName, inputKey);
            String outputUri = String.format("s3://%s/%s", bucketName, outputKey);
            String thumbnailUri = String.format("s3://%s/%s", bucketName, thumbnailKey);

            // Create job settings with thumbnail generation
            JobSettings jobSettings = createJobSettings(inputUri, outputUri, thumbnailUri, mediaFile.getId().toString());

            // Create the job
            // Note: SNS topic for job completion notifications is configured at the MediaConvert queue level,
            // not at the individual job level. This is the industry-standard approach.
            // The SNS topic must be configured in AWS MediaConvert console for the queue being used.
            CreateJobRequest createJobRequest = CreateJobRequest.builder()
                    .role(roleArn)
                    .settings(jobSettings)
                    .build();

            CreateJobResponse response = mediaConvertClient.createJob(createJobRequest);
            String jobId = response.job().id();

            log.info("MediaConvert job created: {} for video: {}", jobId, inputKey);
            return jobId;

        } catch (SdkException e) {
            log.error("Error creating MediaConvert job for video: {}", s3InputKey, e);
            throw new RuntimeException("Failed to start video processing job: " + e.getMessage(), e);
        }
    }

    /**
     * Extract S3 key from full S3 URL
     */
    private String extractS3KeyFromUrl(String url) {
        if (url.startsWith("s3://")) {
            // Already an S3 URI
            return url.substring(("s3://" + bucketName + "/").length());
        }
        if (url.contains(bucketName)) {
            // Full URL, extract key
            int keyStart = url.indexOf(bucketName) + bucketName.length() + 1;
            return url.substring(keyStart);
        }
        // Assume it's already a key
        return url;
    }

    /**
     * Generate S3 output key for processed video
     */
    private String generateOutputKey(MediaFile mediaFile) {
        String folder = mediaFile.getFolder();
        String filename = UUID.randomUUID().toString() + ".mp4";
        return String.format("%s/optimized/%s", folder, filename);
    }

    /**
     * Generate S3 output key for video thumbnail
     * Note: This will be used when thumbnail generation is implemented
     */
    private String generateThumbnailKey(MediaFile mediaFile) {
        String folder = mediaFile.getFolder();
        String filename = UUID.randomUUID().toString() + ".jpg";
        return String.format("%s/thumbnails/%s", folder, filename);
    }

    /**
     * Create MediaConvert job settings for video processing with thumbnail generation
     */
    private JobSettings createJobSettings(String inputUri, String outputUri, String thumbnailUri, String mediaFileId) {
        // Audio selector - selects the first audio track from input
        AudioSelector audioSelector = AudioSelector.builder()
                .selectorType(AudioSelectorType.TRACK)
                .tracks(1) // Select first audio track
                .defaultSelection(AudioDefaultSelection.DEFAULT)
                .build();
        
        // Input settings with audio selector
        Input input = Input.builder()
                .fileInput(inputUri)
                .audioSelectors(java.util.Map.of("Audio Selector 1", audioSelector))
                .build();

        // Video codec settings (H.264)
        VideoCodecSettings videoCodecSettings = VideoCodecSettings.builder()
                .codec(VideoCodec.H_264)
                .h264Settings(H264Settings.builder()
                        .bitrate(videoBitrate * 1000) // Convert kbps to bps
                        .maxBitrate(videoBitrate * 1000)
                        .rateControlMode(H264RateControlMode.VBR)
                        .qualityTuningLevel(H264QualityTuningLevel.SINGLE_PASS_HQ)
                        .codecProfile(H264CodecProfile.MAIN)
                        .codecLevel(H264CodecLevel.AUTO)
                        .interlaceMode(H264InterlaceMode.PROGRESSIVE)
                        .parControl(H264ParControl.INITIALIZE_FROM_SOURCE)
                        .gopSize(2.0) // 2 seconds GOP
                        .gopBReference(H264GopBReference.DISABLED)
                        .sceneChangeDetect(H264SceneChangeDetect.ENABLED)
                        .build())
                .build();

        // Video settings
        VideoDescription videoDescription = VideoDescription.builder()
                .codecSettings(videoCodecSettings)
                .width(targetWidth)
                .height(targetHeight)
                .respondToAfd(RespondToAfd.NONE)
                .colorMetadata(ColorMetadata.INSERT)
                .antiAlias(AntiAlias.ENABLED)
                .sharpness(50)
                .build();

        // Audio codec settings (AAC)
        AudioCodecSettings audioCodecSettings = AudioCodecSettings.builder()
                .codec(AudioCodec.AAC)
                .aacSettings(AacSettings.builder()
                        .bitrate(audioBitrate * 1000) // Convert kbps to bps
                        .codecProfile(AacCodecProfile.LC)
                        .codingMode(AacCodingMode.CODING_MODE_2_0)
                        .sampleRate(44100)
                        .build())
                .build();

        // Audio description - references the audio selector from input
        AudioDescription audioDescription = AudioDescription.builder()
                .codecSettings(audioCodecSettings)
                .audioTypeControl(AudioTypeControl.FOLLOW_INPUT)
                .languageCodeControl(AudioLanguageCodeControl.FOLLOW_INPUT)
                .audioSourceName("Audio Selector 1") // Reference the audio selector
                .build();

        // Container settings (MP4)
        ContainerSettings containerSettings = ContainerSettings.builder()
                .container(ContainerType.MP4)
                .mp4Settings(Mp4Settings.builder()
                        .cslgAtom(Mp4CslgAtom.INCLUDE)
                        .freeSpaceBox(Mp4FreeSpaceBox.EXCLUDE)
                        .moovPlacement(Mp4MoovPlacement.PROGRESSIVE_DOWNLOAD)
                        .build())
                .build();

        // Output settings
        Output output = Output.builder()
                .videoDescription(videoDescription)
                .audioDescriptions(audioDescription)
                .containerSettings(containerSettings)
                .nameModifier("_optimized")
                .build();

        // Output group settings for video
        OutputGroupSettings videoOutputGroupSettings = OutputGroupSettings.builder()
                .type(OutputGroupType.FILE_GROUP_SETTINGS)
                .fileGroupSettings(FileGroupSettings.builder()
                        .destination(outputUri.substring(0, outputUri.lastIndexOf("/")))
                        .build())
                .build();
        
        OutputGroup videoOutputGroup = OutputGroup.builder()
                .outputGroupSettings(videoOutputGroupSettings)
                .outputs(output)
                .build();

        // Thumbnail generation - Frame capture at 1 second mark
        VideoCodecSettings thumbnailCodecSettings = VideoCodecSettings.builder()
                .codec(VideoCodec.FRAME_CAPTURE)
                .frameCaptureSettings(FrameCaptureSettings.builder()
                        .framerateNumerator(1)
                        .framerateDenominator(1)
                        .maxCaptures(1)
                        .quality(80) // JPEG quality 0-100
                        .build())
                .build();

        VideoDescription thumbnailVideoDescription = VideoDescription.builder()
                .codecSettings(thumbnailCodecSettings)
                .width(854) // Match video width
                .height(480) // Match video height
                .build();

        ContainerSettings thumbnailContainerSettings = ContainerSettings.builder()
                .container(ContainerType.RAW) // RAW container for JPEG
                .build();

        Output thumbnailOutput = Output.builder()
                .videoDescription(thumbnailVideoDescription)
                .containerSettings(thumbnailContainerSettings)
                .nameModifier("_thumbnail")
                .build();

        // Output group settings for thumbnail
        OutputGroupSettings thumbnailOutputGroupSettings = OutputGroupSettings.builder()
                .type(OutputGroupType.FILE_GROUP_SETTINGS)
                .fileGroupSettings(FileGroupSettings.builder()
                        .destination(thumbnailUri.substring(0, thumbnailUri.lastIndexOf("/")))
                        .build())
                .build();

        OutputGroup thumbnailOutputGroup = OutputGroup.builder()
                .outputGroupSettings(thumbnailOutputGroupSettings)
                .outputs(thumbnailOutput)
                .build();

        // Job settings with both video and thumbnail output groups
        return JobSettings.builder()
                .inputs(input)
                .outputGroups(videoOutputGroup, thumbnailOutputGroup)
                .timecodeConfig(TimecodeConfig.builder()
                        .source(TimecodeSource.EMBEDDED)
                        .build())
                .build();
    }

    /**
     * Get MediaConvert service role ARN
     * This role must have permissions to read from S3 input bucket and write to S3 output bucket
     * 
     * The role ARN format is: arn:aws:iam::ACCOUNT_ID:role/MediaConvert_Default_Role
     * 
     * You can also set AWS_MEDIACONVERT_ROLE_ARN environment variable to override this
     */
    private String getMediaConvertRoleArn() {
        // First, check for explicit role ARN environment variable
        String explicitRoleArn = System.getenv("AWS_MEDIACONVERT_ROLE_ARN");
        if (explicitRoleArn != null && !explicitRoleArn.trim().isEmpty()) {
            log.debug("Using explicit MediaConvert role ARN from environment variable");
            return explicitRoleArn.trim();
        }
        
        // Otherwise, construct from account ID
        String accountId = awsAccountId != null && !awsAccountId.trim().isEmpty() 
                ? awsAccountId.trim() 
                : System.getenv("AWS_ACCOUNT_ID");
        
        if (accountId == null || accountId.isEmpty()) {
            log.warn("AWS_ACCOUNT_ID not configured. MediaConvert video processing will be disabled. " +
                    "Set AWS_ACCOUNT_ID or AWS_MEDIACONVERT_ROLE_ARN environment variable to enable.");
            return null; // Return null instead of throwing - allows app to start
        }
        
        String roleArn = String.format("arn:aws:iam::%s:role/MediaConvert_Default_Role", accountId);
        log.debug("Using MediaConvert role ARN: {}", roleArn);
        return roleArn;
    }

    /**
     * Get job status
     */
    public Job getJobStatus(String jobId) {
        try {
            GetJobRequest request = GetJobRequest.builder()
                    .id(jobId)
                    .build();
            GetJobResponse response = mediaConvertClient.getJob(request);
            return response.job();
        } catch (SdkException e) {
            log.error("Error getting MediaConvert job status: {}", jobId, e);
            throw new RuntimeException("Failed to get job status: " + e.getMessage(), e);
        }
    }

    /**
     * Extract thumbnail URL from completed MediaConvert job
     * 
     * Constructs the URL from the known thumbnail key pattern.
     * Since we control the key generation, we can reconstruct it from the MediaFile.
     * 
     * @param job The completed MediaConvert job (for logging)
     * @param mediaFile The MediaFile entity (to get folder for URL construction)
     * @return Thumbnail URL or null if not found
     */
    public String extractThumbnailUrl(Job job, MediaFile mediaFile) {
        if (job == null || mediaFile == null) {
            log.warn("Cannot extract thumbnail URL from null job or mediaFile");
            return null;
        }

        try {
            // Get job outputs to find the thumbnail destination
            List<OutputGroupDetail> outputGroups = job.outputGroupDetails();
            if (outputGroups == null || outputGroups.isEmpty()) {
                log.warn("No output groups found in job: {}", job.id());
                return null;
            }

            // Since we control the thumbnail key generation, we can reconstruct it
            // The thumbnail key follows the pattern: {folder}/thumbnails/{uuid}.jpg
            // MediaConvert adds the _thumbnail modifier to the filename
            // We'll construct the URL from the known pattern
            // Note: This is a simplified approach - in production you might want to
            // list S3 files in the thumbnails folder to find the exact file
            
            String folder = mediaFile.getFolder();
            // The thumbnail will be in: {folder}/thumbnails/{inputFilename}_thumbnail.jpg
            // But we don't have the exact filename, so we'll need to list S3 or use a pattern
            // For now, return null and let the caller handle it differently
            // OR we can store the expected thumbnail key when starting the job
            
            log.warn("Thumbnail URL extraction needs S3 listing or stored key. Job: {}", job.id());
            return null; // TODO: Implement S3 listing or store expected key

        } catch (Exception e) {
            log.error("Error extracting thumbnail URL from job: {}", job.id(), e);
            return null;
        }
    }

    /**
     * Convert S3 URI to accessible HTTPS URL
     * Example: s3://bucket-name/path/to/file.jpg -> https://bucket-name.s3.region.amazonaws.com/path/to/file.jpg
     */
    private String convertS3UriToUrl(String s3Uri) {
        if (s3Uri == null || !s3Uri.startsWith("s3://")) {
            return s3Uri; // Return as-is if not an S3 URI
        }

        // Remove s3:// prefix
        String path = s3Uri.substring(5);
        
        // Split bucket and key
        int firstSlash = path.indexOf('/');
        if (firstSlash == -1) {
            // No key, just bucket
            return String.format("https://%s.s3.%s.amazonaws.com/", path, region);
        }

        String bucket = path.substring(0, firstSlash);
        String key = path.substring(firstSlash + 1);
        
        return String.format("https://%s.s3.%s.amazonaws.com/%s", bucket, region, key);
    }

    /**
     * Cancel a job
     */
    public void cancelJob(String jobId) {
        try {
            CancelJobRequest request = CancelJobRequest.builder()
                    .id(jobId)
                    .build();
            mediaConvertClient.cancelJob(request);
            log.info("MediaConvert job cancelled: {}", jobId);
        } catch (SdkException e) {
            log.error("Error cancelling MediaConvert job: {}", jobId, e);
            throw new RuntimeException("Failed to cancel job: " + e.getMessage(), e);
        }
    }
}

