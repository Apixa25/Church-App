-- Add expected output key columns to media_files table
-- These store the S3 keys where MediaConvert will write output files
-- Stored at job start time so webhook doesn't need to guess paths

ALTER TABLE media_files ADD COLUMN expected_optimized_key VARCHAR(500);
ALTER TABLE media_files ADD COLUMN expected_thumbnail_key VARCHAR(500);

COMMENT ON COLUMN media_files.expected_optimized_key IS 'S3 key where MediaConvert will write optimized video (e.g., media/posts/optimized/uuid_optimized.mp4)';
COMMENT ON COLUMN media_files.expected_thumbnail_key IS 'S3 key where MediaConvert will write thumbnail (e.g., media/posts/thumbnails/uuid.0000000.jpg)';
