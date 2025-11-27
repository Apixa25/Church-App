-- ============================================================================
-- Migration: Add EVERYTHING option to feed filter enum
-- Version: V26
-- Description: Updates the feed_preferences check constraint to allow the
--              new EVERYTHING filter option which includes the Global Feed
-- ============================================================================

-- Drop the old constraint
ALTER TABLE feed_preferences DROP CONSTRAINT IF EXISTS chk_feed_preferences_filter;

-- Add new constraint with EVERYTHING option
ALTER TABLE feed_preferences ADD CONSTRAINT chk_feed_preferences_filter
    CHECK(active_filter IN('EVERYTHING', 'ALL', 'PRIMARY_ONLY', 'SELECTED_GROUPS'));

-- Update any existing preferences that might be null or have old default value
-- Set them to EVERYTHING (the new default)
UPDATE feed_preferences 
SET active_filter = 'EVERYTHING'
WHERE active_filter = 'ALL' OR active_filter IS NULL;

-- Note: This migration allows users to experience the new default behavior
-- where 'EVERYTHING' includes the Global Feed, while 'ALL' now means just
-- their organizations and groups (no Global Feed)


