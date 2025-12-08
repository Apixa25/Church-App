-- ============================================================================
-- V34: VIDEO THUMBNAIL SUPPORT
-- ============================================================================
-- This migration adds support for video thumbnails in posts.
-- Following industry standard approach used by X.com and other platforms.
--
-- Changes:
-- 1. Add post_media_thumbnail_urls table to store thumbnail URLs for each media item
-- 2. Thumbnails are optional - only videos will have thumbnails
-- 3. Each thumbnail URL corresponds to a media URL at the same index
-- ============================================================================

-- Create table for storing video thumbnail URLs
-- This follows the same pattern as post_media_urls and post_media_types
CREATE TABLE IF NOT EXISTS post_media_thumbnail_urls (
    post_id UUID NOT NULL,
    thumbnail_url VARCHAR(1000),
    CONSTRAINT fk_post_media_thumbnails_post FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_media_thumbnail_urls_post_id ON post_media_thumbnail_urls(post_id);

-- Add comment for documentation
COMMENT ON TABLE post_media_thumbnail_urls IS 'Stores thumbnail URLs for video media in posts. Each thumbnail corresponds to a media URL at the same index.';

