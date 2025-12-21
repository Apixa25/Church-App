-- V39: Add denormalized views_count to posts table for fast display
-- This is similar to likes_count and comments_count pattern

ALTER TABLE posts ADD COLUMN views_count INTEGER NOT NULL DEFAULT 0;

-- Index for sorting/filtering by views
CREATE INDEX idx_posts_views_count ON posts(views_count DESC);

-- Backfill existing view counts from post_views table
UPDATE posts p
SET views_count = (
    SELECT COUNT(*)
    FROM post_views pv
    WHERE pv.post_id = p.id
);

-- Comment for documentation
COMMENT ON COLUMN posts.views_count IS 'Cached total view count from post_views table. Updated when PostAnalyticsService.recordPostView() is called';
