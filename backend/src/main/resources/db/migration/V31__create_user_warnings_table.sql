-- Migration: Create user_warnings table for storing warning history
-- Stores detailed warning records with reason, message, and related content

CREATE TABLE user_warnings (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    warned_by UUID NOT NULL,
    
    -- Warning details
    reason VARCHAR(255) NOT NULL,
    message TEXT,
    
    -- Related content (optional - links warning to specific content)
    content_type VARCHAR(50), -- POST, COMMENT, PRAYER, etc.
    content_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (warned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_user_warnings_user_id ON user_warnings(user_id, created_at DESC);
CREATE INDEX idx_user_warnings_warned_by ON user_warnings(warned_by);
CREATE INDEX idx_user_warnings_content ON user_warnings(content_type, content_id);

-- Add comment for documentation
COMMENT ON TABLE user_warnings IS 'Stores detailed warning history for users. Each warning includes reason, message, moderator who issued it, and optional link to related content.';

