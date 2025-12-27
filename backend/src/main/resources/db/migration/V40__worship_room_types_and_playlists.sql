-- V40: Add room types, playlist templates, and live event support to worship rooms
-- This migration adds:
-- 1. Room type field (LIVE, TEMPLATE, LIVE_EVENT)
-- 2. Playlist templates table for reusable playlists
-- 3. Playlist entries table for videos in playlists
-- 4. Live event scheduling fields

-- Add room_type to worship_rooms (default to LIVE for existing rooms)
ALTER TABLE worship_rooms ADD COLUMN room_type VARCHAR(20) DEFAULT 'LIVE';
ALTER TABLE worship_rooms ADD CONSTRAINT chk_worship_room_type CHECK (room_type IN ('LIVE', 'TEMPLATE', 'LIVE_EVENT'));

-- Add live event specific fields to worship_rooms
ALTER TABLE worship_rooms ADD COLUMN scheduled_start_time TIMESTAMP;
ALTER TABLE worship_rooms ADD COLUMN scheduled_end_time TIMESTAMP;
ALTER TABLE worship_rooms ADD COLUMN live_stream_url VARCHAR(500);
ALTER TABLE worship_rooms ADD COLUMN is_live_stream_active BOOLEAN DEFAULT FALSE;
ALTER TABLE worship_rooms ADD COLUMN auto_start_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE worship_rooms ADD COLUMN auto_close_enabled BOOLEAN DEFAULT TRUE;

-- Add template-specific fields
ALTER TABLE worship_rooms ADD COLUMN is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE worship_rooms ADD COLUMN template_source_id UUID;
ALTER TABLE worship_rooms ADD COLUMN allow_user_start BOOLEAN DEFAULT FALSE;

-- Add index for room type queries
CREATE INDEX idx_worship_room_type ON worship_rooms(room_type);
CREATE INDEX idx_worship_room_scheduled_start ON worship_rooms(scheduled_start_time);

-- Create worship_playlists table for reusable playlist templates
CREATE TABLE worship_playlists (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    created_by UUID NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    total_duration INTEGER DEFAULT 0,
    video_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_worship_playlists PRIMARY KEY (id),
    CONSTRAINT fk_worship_playlists_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_worship_playlist_created_by ON worship_playlists(created_by);
CREATE INDEX idx_worship_playlist_is_public ON worship_playlists(is_public);
CREATE INDEX idx_worship_playlist_is_active ON worship_playlists(is_active);

-- Create worship_playlist_entries table for videos in playlists
CREATE TABLE worship_playlist_entries (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL,
    video_id VARCHAR(100) NOT NULL,
    video_title VARCHAR(500) NOT NULL,
    video_duration INTEGER,
    video_thumbnail_url VARCHAR(500),
    position INTEGER NOT NULL,
    added_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_worship_playlist_entries PRIMARY KEY (id),
    CONSTRAINT fk_playlist_entries_playlist FOREIGN KEY (playlist_id) REFERENCES worship_playlists(id) ON DELETE CASCADE,
    CONSTRAINT fk_playlist_entries_added_by FOREIGN KEY (added_by) REFERENCES users(id)
);

CREATE INDEX idx_playlist_entry_playlist ON worship_playlist_entries(playlist_id);
CREATE INDEX idx_playlist_entry_position ON worship_playlist_entries(position);

-- Link rooms to playlists (optional - a room can use a playlist as its source)
ALTER TABLE worship_rooms ADD COLUMN playlist_id UUID;
ALTER TABLE worship_rooms ADD CONSTRAINT fk_worship_room_playlist FOREIGN KEY (playlist_id) REFERENCES worship_playlists(id);

-- Add current_playlist_position to track where we are in a playlist-based room
ALTER TABLE worship_rooms ADD COLUMN current_playlist_position INTEGER DEFAULT 0;

-- Create table to track scheduled live events
CREATE TABLE worship_scheduled_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    stream_url VARCHAR(500) NOT NULL,
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    status VARCHAR(20) DEFAULT 'SCHEDULED',
    created_by UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_worship_scheduled_events PRIMARY KEY (id),
    CONSTRAINT fk_scheduled_events_room FOREIGN KEY (room_id) REFERENCES worship_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_scheduled_events_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT chk_scheduled_event_status CHECK (status IN ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'))
);

CREATE INDEX idx_scheduled_event_room ON worship_scheduled_events(room_id);
CREATE INDEX idx_scheduled_event_start ON worship_scheduled_events(scheduled_start);
CREATE INDEX idx_scheduled_event_status ON worship_scheduled_events(status);

-- Add self-referencing foreign key for template_source_id
ALTER TABLE worship_rooms ADD CONSTRAINT fk_worship_room_template_source FOREIGN KEY (template_source_id) REFERENCES worship_rooms(id);

-- Update existing rooms to be LIVE type
UPDATE worship_rooms SET room_type = 'LIVE' WHERE room_type IS NULL;
