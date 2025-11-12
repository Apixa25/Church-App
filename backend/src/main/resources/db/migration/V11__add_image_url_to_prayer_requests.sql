-- Add image_url column to prayer_requests table
-- This allows users to upload images when creating prayer requests

ALTER TABLE prayer_requests
    ADD COLUMN image_url VARCHAR(500);

