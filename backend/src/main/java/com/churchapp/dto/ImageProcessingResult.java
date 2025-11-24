package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of image processing operation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImageProcessingResult {
    private byte[] processedImageData;
    private String contentType; // Should be "image/jpeg"
    private long originalSize;
    private long processedSize;
    private int originalWidth;
    private int originalHeight;
    private int processedWidth;
    private int processedHeight;
    private double compressionRatio; // processedSize / originalSize
}

