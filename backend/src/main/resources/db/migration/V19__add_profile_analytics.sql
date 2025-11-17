-- Migration: Add profile analytics tables
-- This enables tracking of profile views, post views, and follower growth

-- Profile Views Table
-- Tracks who viewed whose profile
CREATE TABLE profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_anonymous BOOLEAN DEFAULT false
);

-- Unique constraint: Prevent duplicate views in same day (using index with expression)
CREATE UNIQUE INDEX idx_profile_views_unique_daily 
    ON profile_views(viewer_id, viewed_user_id, DATE(viewed_at));

-- Indexes for efficient queries
CREATE INDEX idx_profile_views_viewed_user ON profile_views(viewed_user_id, viewed_at DESC);
CREATE INDEX idx_profile_views_viewer ON profile_views(viewer_id, viewed_at DESC);
CREATE INDEX idx_profile_views_viewed_at ON profile_views(viewed_at DESC);

-- Post Views Table
-- Tracks who viewed which posts
CREATE TABLE post_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous views
    viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    time_spent_seconds INTEGER DEFAULT 0 -- How long user spent viewing (future enhancement)
);

-- Unique constraint: Track unique views per user per post per day (using index with expression)
-- Note: NULL viewer_id values are allowed (for anonymous views) and won't conflict
CREATE UNIQUE INDEX idx_post_views_unique_daily 
    ON post_views(post_id, viewer_id, DATE(viewed_at))
    WHERE viewer_id IS NOT NULL;

-- Index for anonymous views (viewer_id IS NULL) - allow multiple per day
CREATE INDEX idx_post_views_anonymous ON post_views(post_id, DATE(viewed_at))
    WHERE viewer_id IS NULL;

-- Indexes for efficient queries
CREATE INDEX idx_post_views_post ON post_views(post_id, viewed_at DESC);
CREATE INDEX idx_post_views_viewer ON post_views(viewer_id, viewed_at DESC);
CREATE INDEX idx_post_views_viewed_at ON post_views(viewed_at DESC);

-- Follower Snapshots Table
-- Daily snapshots of follower counts for growth tracking
CREATE TABLE follower_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    follower_count INTEGER NOT NULL DEFAULT 0,
    following_count INTEGER NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    -- One snapshot per user per day
    UNIQUE(user_id, snapshot_date)
);

-- Indexes for efficient queries
CREATE INDEX idx_follower_snapshots_user ON follower_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_follower_snapshots_date ON follower_snapshots(snapshot_date DESC);

-- Add comments for documentation
COMMENT ON TABLE profile_views IS 'Tracks profile views. Only visible to the profile owner.';
COMMENT ON TABLE post_views IS 'Tracks post views for engagement analytics.';
COMMENT ON TABLE follower_snapshots IS 'Daily snapshots of follower/following counts for growth tracking.';

