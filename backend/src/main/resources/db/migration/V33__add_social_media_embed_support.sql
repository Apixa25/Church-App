-- ============================================================================
-- V33: SOCIAL MEDIA EMBED SUPPORT
-- ============================================================================
-- This migration adds support for embedding social media content (X, Facebook, Instagram)
-- into posts. Following industry standard approach used by X.com and other platforms.
--
-- Changes:
-- 1. Add external_url column to store the original social media URL
-- 2. Add external_platform column to identify the platform (X_POST, FACEBOOK_REEL, etc.)
-- 3. Add external_embed_html column to store oEmbed HTML response
-- ============================================================================

-- Add external URL column for storing social media links
ALTER TABLE posts 
ADD COLUMN external_url VARCHAR(500);

-- Add platform identifier column
ALTER TABLE posts 
ADD COLUMN external_platform VARCHAR(50);

-- Add oEmbed HTML storage (TEXT for potentially long HTML)
ALTER TABLE posts 
ADD COLUMN external_embed_html TEXT;

-- Create index for querying posts by external platform
CREATE INDEX idx_posts_external_platform ON posts(external_platform) 
WHERE external_platform IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN posts.external_url IS 'Original URL of the shared social media content (X, Facebook, Instagram, YouTube)';
COMMENT ON COLUMN posts.external_platform IS 'Platform type: X_POST, FACEBOOK_REEL, INSTAGRAM_REEL, YOUTUBE';
COMMENT ON COLUMN posts.external_embed_html IS 'oEmbed HTML response for rendering embedded content';

