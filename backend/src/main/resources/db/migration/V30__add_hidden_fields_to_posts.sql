-- Migration: Add hidden post functionality
-- Allows moderators to hide posts from public view while keeping them visible to the author

ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden_by UUID;

-- Add foreign key for hidden_by
ALTER TABLE posts ADD CONSTRAINT fk_posts_hidden_by 
    FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for efficient filtering of hidden posts
CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON posts(is_hidden, created_at);

-- Add comment for documentation
COMMENT ON COLUMN posts.is_hidden IS 'If true, post is hidden from public feeds and other users, but still visible to the author on their profile';
COMMENT ON COLUMN posts.hidden_at IS 'Timestamp when the post was hidden by a moderator';
COMMENT ON COLUMN posts.hidden_by IS 'UUID of the moderator who hid the post';
