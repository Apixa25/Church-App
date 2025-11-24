package com.churchapp.dto;

/**
 * Status of media file processing
 */
public enum ProcessingStatus {
    PENDING,      // File uploaded, waiting for processing
    PROCESSING,   // Currently being processed
    COMPLETED,    // Processing completed successfully
    FAILED        // Processing failed
}

