-- Create user_likes table for social score (hearts)
CREATE TABLE user_likes (
    user_id UUID NOT NULL,
    liked_user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, liked_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (liked_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_user_like_liked_user ON user_likes(liked_user_id);
CREATE INDEX idx_user_like_user ON user_likes(user_id);

-- Add hearts_count column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS hearts_count INT NOT NULL DEFAULT 0;

-- Create index on hearts_count for sorting/filtering (useful for social score queries)
CREATE INDEX IF NOT EXISTS idx_user_hearts_count ON users(hearts_count);

