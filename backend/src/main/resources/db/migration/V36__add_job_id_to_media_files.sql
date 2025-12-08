-- V36: ADD JOB ID TO MEDIA FILES
-- This migration adds a job_id column to track MediaConvert job IDs.
-- This enables polling for job completion status.
--
-- Changes:
-- 1. Add job_id column to media_files table
-- 2. Create index for faster lookups of processing jobs
-- ============================================================================

-- Add job ID column for MediaConvert job tracking
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS job_id VARCHAR(100);

-- Create index for faster lookups of processing jobs
CREATE INDEX IF NOT EXISTS idx_media_files_job_id ON media_files(job_id) 
WHERE job_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN media_files.job_id IS 'MediaConvert job ID for video processing. Used to poll job status and extract thumbnail URLs.';

