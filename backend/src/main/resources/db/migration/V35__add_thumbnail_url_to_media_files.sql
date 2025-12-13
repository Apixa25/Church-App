-- ============================================================================
-- V35: ADD THUMBNAIL URL TO MEDIA FILES
-- ============================================================================
-- This migration adds thumbnail URL support to the media_files table.
-- Thumbnails are generated for videos during processing and stored in S3.
--
-- Changes:
-- 1. Add thumbnail_url column to media_files table
-- 2. Thumbnails are optional - only videos will have thumbnails
-- ============================================================================

-- Add thumbnail URL column for video thumbnails
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_media_files_thumbnail_url ON media_files(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN media_files.thumbnail_url IS 'URL of video thumbnail image (JPEG), stored in S3 /thumbnails/ folder. Only videos have thumbnails.';

