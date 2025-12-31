-- Add image_url column to groups table
-- This allows users to upload images when creating groups

ALTER TABLE groups
    ADD COLUMN image_url VARCHAR(500);
