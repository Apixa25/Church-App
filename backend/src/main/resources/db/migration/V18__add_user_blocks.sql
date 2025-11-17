-- Migration: Add user_blocks table for blocking functionality
-- This allows users to block other users, hiding their content from feeds

CREATE TABLE user_blocks (
    blocker_id UUID NOT NULL,
    blocked_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (blocker_id != blocked_id) -- Can't block yourself
);

-- Indexes for efficient queries
CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);
CREATE INDEX idx_user_blocks_created_at ON user_blocks(created_at);

-- Add comment for documentation
COMMENT ON TABLE user_blocks IS 'Stores user blocking relationships. When user A blocks user B, user A will not see user B''s posts, comments, or profile in search results.';

