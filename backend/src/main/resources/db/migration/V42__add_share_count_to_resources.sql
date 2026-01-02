-- Add share_count field to resources table for tracking link shares
ALTER TABLE resources ADD COLUMN share_count INTEGER NOT NULL DEFAULT 0;
