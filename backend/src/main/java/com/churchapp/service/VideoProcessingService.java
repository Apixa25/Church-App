package com.churchapp.service;

import com.churchapp.dto.VideoProcessingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.bytedeco.javacv.FFmpegFrameRecorder;
import org.bytedeco.javacv.Frame;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Service for processing and optimizing videos
 * Implements server-side video compression to 480p similar to Facebook/X approach
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class VideoProcessingService {

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
     * Process and optimize a video
     * 
     * @param file Original video file
     * @return Processing result with optimized video data
     * @throws IOException If processing fails
     */
    public VideoProcessingResult processVideo(MultipartFile file) throws IOException {
        log.info("Processing video: {} ({} bytes)", file.getOriginalFilename(), file.getSize());

        // Create temporary files
        Path tempInput = Files.createTempFile("video-input-", ".mp4");
        Path tempOutput = Files.createTempFile("video-output-", ".mp4");

        try {
            // Save uploaded file to temp location
            file.transferTo(tempInput.toFile());

            // Extract video metadata
            VideoMetadata metadata = extractMetadata(tempInput.toFile());

            // Validate duration
            if (metadata.durationSeconds > maxDurationSeconds) {
                throw new IllegalArgumentException(
                    String.format("Video duration (%d seconds) exceeds maximum allowed duration of %d seconds",
                        metadata.durationSeconds, maxDurationSeconds)
                );
            }

            log.info("Video metadata: {}x{}, {} seconds, {} fps",
                    metadata.width, metadata.height, metadata.durationSeconds, metadata.frameRate);

            // Log if video is high resolution (we'll scale it down)
            if (metadata.width > 1920 || metadata.height > 1080) {
                log.info("High-resolution video detected: {}x{} (will be scaled to 480p)",
                        metadata.width, metadata.height);
            }

            // Compress video to 480p
            compressVideo(tempInput.toFile(), tempOutput.toFile(), metadata);

            // Read processed video
            byte[] processedData = Files.readAllBytes(tempOutput);
            long processedSize = processedData.length;
            long originalSize = file.getSize();
            double compressionRatio = (double) processedSize / originalSize;

            log.info("Video processed: {} bytes -> {} bytes ({}% reduction, ratio: {:.2f})",
                    originalSize, processedSize,
                    Math.round((1 - compressionRatio) * 100), compressionRatio);

            return new VideoProcessingResult(
                    processedData,
                    "video/mp4",
                    originalSize,
                    processedSize,
                    metadata.width,
                    metadata.height,
                    targetWidth,
                    targetHeight,
                    metadata.durationSeconds,
                    compressionRatio
            );

        } finally {
            // Clean up temp files
            Files.deleteIfExists(tempInput);
            Files.deleteIfExists(tempOutput);
        }
    }

    /**
     * Extract video metadata
     */
    private VideoMetadata extractMetadata(File videoFile) throws IOException {
        try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(videoFile)) {
            grabber.start();

            int width = grabber.getImageWidth();
            int height = grabber.getImageHeight();
            double frameRate = grabber.getFrameRate();
            long totalFrames = grabber.getLengthInFrames();

            // Calculate duration
            int durationSeconds = 0;
            if (frameRate > 0 && totalFrames > 0) {
                durationSeconds = (int) Math.ceil(totalFrames / frameRate);
            } else if (grabber.getLengthInTime() > 0) {
                durationSeconds = (int) (grabber.getLengthInTime() / 1000000); // Convert microseconds to seconds
            }

            grabber.stop();

            return new VideoMetadata(durationSeconds, width, height, frameRate);
        }
    }

    /**
     * Compress video to target resolution and bitrate
     */
    private void compressVideo(File input, File output, VideoMetadata metadata) throws IOException {
        try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(input);
             FFmpegFrameRecorder recorder = new FFmpegFrameRecorder(output, targetWidth, targetHeight)) {

            grabber.start();

            // Configure recorder
            // H264 codec ID = 27, AAC codec ID = 86018
            recorder.setVideoCodec(27); // AV_CODEC_ID_H264
            recorder.setFormat("mp4");
            recorder.setVideoBitrate(videoBitrate * 1000); // Convert kbps to bps
            recorder.setVideoQuality(0); // Use bitrate instead of quality
            recorder.setFrameRate(Math.min(frameRate, (int) metadata.frameRate));
            recorder.setVideoOption("preset", "fast");
            recorder.setVideoOption("crf", "23"); // Quality setting (lower = better quality)

            // Audio settings
            recorder.setAudioCodec(86018); // AV_CODEC_ID_AAC
            recorder.setAudioBitrate(audioBitrate * 1000);
            recorder.setAudioChannels(2);
            recorder.setSampleRate(44100);

            recorder.start();

            Frame frame;
            while ((frame = grabber.grabFrame()) != null) {
                if (frame.image != null) {
                    // Video frame - JavaCV will automatically resize to target dimensions
                    recorder.record(frame);
                } else if (frame.samples != null) {
                    // Audio frame
                    recorder.record(frame);
                }
            }

            recorder.stop();
            grabber.stop();
        }
    }

    /**
     * Inner class for video metadata
     */
    private static class VideoMetadata {
        final int durationSeconds;
        final int width;
        final int height;
        final double frameRate;

        VideoMetadata(int durationSeconds, int width, int height, double frameRate) {
            this.durationSeconds = durationSeconds;
            this.width = width;
            this.height = height;
            this.frameRate = frameRate;
        }
    }
}

