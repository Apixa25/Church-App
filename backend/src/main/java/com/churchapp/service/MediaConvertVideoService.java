package com.churchapp.service;

import com.churchapp.entity.MediaFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.services.mediaconvert.MediaConvertClient;
import software.amazon.awssdk.services.mediaconvert.model.*;

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
            log.info("Starting MediaConvert job for video: {} (MediaFile ID: {})", s3InputKey, mediaFile.getId());

            // Extract S3 key from original URL if full URL provided
            String inputKey = extractS3KeyFromUrl(s3InputKey);
            String outputKey = generateOutputKey(mediaFile);

            // Build S3 URIs
            String inputUri = String.format("s3://%s/%s", bucketName, inputKey);
            String outputUri = String.format("s3://%s/%s", bucketName, outputKey);

            // Create job settings
            JobSettings jobSettings = createJobSettings(inputUri, outputUri, mediaFile.getId().toString());

            // Create the job
            CreateJobRequest createJobRequest = CreateJobRequest.builder()
                    .role(getMediaConvertRoleArn())
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
     * Create MediaConvert job settings for video processing
     */
    private JobSettings createJobSettings(String inputUri, String outputUri, String mediaFileId) {
        // Input settings
        Input input = Input.builder()
                .fileInput(inputUri)
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

        // Audio description
        AudioDescription audioDescription = AudioDescription.builder()
                .codecSettings(audioCodecSettings)
                .audioTypeControl(AudioTypeControl.FOLLOW_INPUT)
                .languageCodeControl(AudioLanguageCodeControl.FOLLOW_INPUT)
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

        // Output group settings
        OutputGroupSettings outputGroupSettings = OutputGroupSettings.builder()
                .type(OutputGroupType.FILE_GROUP_SETTINGS)
                .fileGroupSettings(FileGroupSettings.builder()
                        .destination(outputUri.substring(0, outputUri.lastIndexOf("/")))
                        .build())
                .build();

        OutputGroup outputGroup = OutputGroup.builder()
                .outputGroupSettings(outputGroupSettings)
                .outputs(output)
                .build();

        // Job settings
        return JobSettings.builder()
                .inputs(input)
                .outputGroups(outputGroup)
                .timecodeConfig(TimecodeConfig.builder()
                        .source(TimecodeSource.EMBEDDED)
                        .build())
                .build();
    }

    /**
     * Get MediaConvert service role ARN
     * This role must have permissions to read from S3 input bucket and write to S3 output bucket
     */
    private String getMediaConvertRoleArn() {
        // In production, this should be an environment variable
        // For now, we'll construct it from the account ID (you'll need to set this)
        // Format: arn:aws:iam::ACCOUNT_ID:role/MediaConvert_Default_Role
        String accountId = System.getenv("AWS_ACCOUNT_ID");
        if (accountId == null || accountId.isEmpty()) {
            log.warn("AWS_ACCOUNT_ID environment variable not set. Using placeholder. " +
                    "Please set AWS_ACCOUNT_ID environment variable or create MediaConvert role manually.");
            // Default role name - you should create this in IAM and set AWS_ACCOUNT_ID
            return "arn:aws:iam::YOUR_ACCOUNT_ID:role/MediaConvert_Default_Role";
        }
        return String.format("arn:aws:iam::%s:role/MediaConvert_Default_Role", accountId);
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

