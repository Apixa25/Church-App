-- V38: Add comment read status tracking for inline "new comments" indicators
-- This table tracks when users last viewed comments on posts

CREATE TABLE post_comment_read_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_read_comment_id UUID REFERENCES post_comments(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_post_read UNIQUE(user_id, post_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_comment_read_user ON post_comment_read_status(user_id);
CREATE INDEX idx_comment_read_post ON post_comment_read_status(post_id);
CREATE INDEX idx_comment_read_timestamp ON post_comment_read_status(last_read_at);

-- Comment on table for documentation
COMMENT ON TABLE post_comment_read_status IS 'Tracks when users last viewed comments on posts for "new comments" indicators';
COMMENT ON COLUMN post_comment_read_status.last_read_at IS 'Timestamp when user last opened this post comments. Comments created after this are "new"';
COMMENT ON COLUMN post_comment_read_status.last_read_comment_id IS 'Optional: ID of the last comment the user saw (for future enhancements)';
