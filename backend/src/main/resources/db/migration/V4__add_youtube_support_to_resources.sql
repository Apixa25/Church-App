-- Add YouTube video support fields to resources table
ALTER TABLE resources ADD COLUMN youtube_url VARCHAR(500);
ALTER TABLE resources ADD COLUMN youtube_video_id VARCHAR(50);
ALTER TABLE resources ADD COLUMN youtube_title VARCHAR(200);
ALTER TABLE resources ADD COLUMN youtube_thumbnail_url VARCHAR(1000);
ALTER TABLE resources ADD COLUMN youtube_duration VARCHAR(20);
ALTER TABLE resources ADD COLUMN youtube_channel VARCHAR(200);

-- Add index for YouTube video ID for faster lookups
CREATE INDEX idx_resource_youtube_video_id ON resources(youtube_video_id);

-- Add index for YouTube URL for faster lookups
CREATE INDEX idx_resource_youtube_url ON resources(youtube_url);
