-- Create media_files table for tracking media processing status
-- Version 23: Media file processing tracking
-- This table tracks original and optimized file URLs, processing status, and metadata

CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_url VARCHAR(500) NOT NULL,
    optimized_url VARCHAR(500),
    file_type VARCHAR(50) NOT NULL, -- 'image' or 'video'
    processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    original_size BIGINT NOT NULL,
    optimized_size BIGINT,
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    folder VARCHAR(100) NOT NULL, -- S3 folder (e.g., 'posts', 'chat-media', 'profile-pics')
    original_filename VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX idx_media_files_status ON media_files(processing_status);
CREATE INDEX idx_media_files_created_at ON media_files(created_at);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);
CREATE INDEX idx_media_files_folder ON media_files(folder);

-- Add comment to table
COMMENT ON TABLE media_files IS 'Tracks media file processing status, original and optimized URLs, and metadata';

-- Add comments to key columns
COMMENT ON COLUMN media_files.original_url IS 'URL of original file uploaded by user (S3 /originals/ folder)';
COMMENT ON COLUMN media_files.optimized_url IS 'URL of processed/compressed file (S3 /optimized/ folder), null until processing completes';
COMMENT ON COLUMN media_files.processing_status IS 'Status: PENDING, PROCESSING, COMPLETED, or FAILED';
COMMENT ON COLUMN media_files.folder IS 'S3 folder where file is stored (e.g., posts, chat-media, profile-pics)';

