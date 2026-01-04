-- V45: Add animated avatar support for worship rooms
-- Creates avatar catalog and tracks user avatar selections

-- Create avatars catalog table
CREATE TABLE worship_avatars (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description VARCHAR(200),
    sprite_sheet_url VARCHAR(500) NOT NULL,
    frame_count INTEGER NOT NULL DEFAULT 8,
    frame_width INTEGER NOT NULL DEFAULT 64,
    frame_height INTEGER NOT NULL DEFAULT 64,
    animation_duration_ms INTEGER NOT NULL DEFAULT 800,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_worship_avatars PRIMARY KEY (id)
);

CREATE INDEX idx_worship_avatar_active ON worship_avatars(is_active);
CREATE INDEX idx_worship_avatar_sort ON worship_avatars(sort_order);

-- Add selected_avatar_id to users table (global preference)
ALTER TABLE users ADD COLUMN selected_avatar_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_user_selected_avatar
    FOREIGN KEY (selected_avatar_id) REFERENCES worship_avatars(id);

-- Insert 6 default avatar characters
-- Note: Using placeholder SVG data URLs until proper pixel art sprites are created
-- Each sprite sheet is a horizontal strip with multiple frames
INSERT INTO worship_avatars (name, description, sprite_sheet_url, frame_count, frame_width, frame_height, animation_duration_ms, sort_order) VALUES
    ('Worshiper', 'Hands raised in worship', '/avatars/worshiper.png', 8, 64, 64, 800, 1),
    ('Dancer', 'Dancing to the beat', '/avatars/dancer.png', 8, 64, 64, 600, 2),
    ('Singer', 'Singing along', '/avatars/singer.png', 6, 64, 64, 1000, 3),
    ('Clapper', 'Clapping hands', '/avatars/clapper.png', 4, 64, 64, 400, 4),
    ('Swayer', 'Gentle swaying', '/avatars/swayer.png', 6, 64, 64, 1200, 5),
    ('Jumper', 'Jumping with joy', '/avatars/jumper.png', 8, 64, 64, 500, 6);
