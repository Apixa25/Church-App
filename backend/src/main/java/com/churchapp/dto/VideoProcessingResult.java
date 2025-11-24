package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of video processing operation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoProcessingResult {
    private byte[] processedVideoData;
    private String contentType; // Should be "video/mp4"
    private long originalSize;
    private long processedSize;
    private int originalWidth;
    private int originalHeight;
    private int processedWidth; // Should be 854
    private int processedHeight; // Should be 480
    private int durationSeconds;
    private double compressionRatio; // processedSize / originalSize
}

