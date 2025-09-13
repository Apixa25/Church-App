-- Social Feed Database Schema Migration
-- Version 2: Adding social feed functionality to Church App

-- ===================================================
-- POSTS TABLE: Main social posts
-- ===================================================
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT RANDOM_UUID(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],                    -- Array of media URLs (images/videos)
    media_types TEXT[],                   -- Array of media types ('image', 'video')
    parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE, -- For replies/threads
    quoted_post_id UUID REFERENCES posts(id) ON DELETE CASCADE, -- For quote posts
    is_reply BOOLEAN DEFAULT FALSE,
    is_quote BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    post_type VARCHAR(50) DEFAULT 'general',  -- 'general', 'prayer', 'testimony', 'announcement'
    is_anonymous BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),                 -- 'praise', 'prayer', 'fellowship', etc.
    location VARCHAR(255),                 -- Optional location context
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    bookmarks_count INTEGER DEFAULT 0
);

-- ===================================================
-- POST LIKES TABLE: User likes on posts
-- ===================================================
CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- ===================================================
-- POST COMMENTS TABLE: Comment/reply system
-- ===================================================
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID PRIMARY KEY DEFAULT RANDOM_UUID(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    media_urls TEXT[],
    media_types TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_anonymous BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0
);

-- ===================================================
-- POST SHARES TABLE: Repost/share functionality
-- ===================================================
CREATE TABLE IF NOT EXISTS post_shares (
    id UUID PRIMARY KEY DEFAULT RANDOM_UUID(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_type VARCHAR(20) DEFAULT 'repost', -- 'repost', 'quote'
    content TEXT,                           -- Optional quote text
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- POST BOOKMARKS TABLE: Save posts for later
-- ===================================================
CREATE TABLE IF NOT EXISTS post_bookmarks (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

-- ===================================================
-- USER FOLLOWS TABLE: Following system
-- ===================================================
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id != following_id) -- Users cannot follow themselves
);

-- ===================================================
-- HASHTAGS TABLE: Hashtag tracking
-- ===================================================
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT RANDOM_UUID(),
    tag VARCHAR(100) NOT NULL UNIQUE,      -- The hashtag without #
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================
-- POST HASHTAGS TABLE: Many-to-many relationship
-- ===================================================
CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

-- ===================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_quoted_post_id ON posts(quoted_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_reply ON posts(is_reply);
CREATE INDEX IF NOT EXISTS idx_posts_is_quote ON posts(is_quote);
CREATE INDEX IF NOT EXISTS idx_posts_is_anonymous ON posts(is_anonymous);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_comment_id ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- User follows indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- Hashtags indexes
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_usage_count ON hashtags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_last_used ON hashtags(last_used DESC);

-- Post hashtags indexes
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- ===================================================
-- FULL-TEXT SEARCH SETUP (H2 specific)
-- ===================================================

-- Create full-text search index on posts content
CREATE ALIAS IF NOT EXISTS FT_INIT FOR "org.h2.fulltext.FullText.init";
CREATE ALIAS IF NOT EXISTS FT_CREATE_INDEX FOR "org.h2.fulltext.FullText.createIndex";
CREATE ALIAS IF NOT EXISTS FT_DROP_INDEX FOR "org.h2.fulltext.FullText.dropIndex";
CREATE ALIAS IF NOT EXISTS FT_SEARCH FOR "org.h2.fulltext.FullText.search";

-- Initialize full-text search and create index on posts
CALL FT_INIT();
CALL FT_CREATE_INDEX('PUBLIC', 'POSTS', 'CONTENT');

-- ===================================================
-- INITIAL DATA (Optional examples)
-- ===================================================

-- Insert some example hashtags
INSERT INTO hashtags (tag, usage_count) VALUES
('PrayerRequest', 0),
('Testimony', 0),
('PraiseReport', 0),
('BibleStudy', 0),
('ChurchLife', 0),
('Community', 0),
('Worship', 0),
('Fellowship', 0);

COMMIT;
