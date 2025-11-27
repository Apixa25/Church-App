-- Add selected_organization_id column to feed_preferences table
-- This allows filtering by a specific organization when PRIMARY_ONLY filter is selected
-- Supports dual-primary system where users can filter by either churchPrimary or familyPrimary

-- Only add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'feed_preferences' 
        AND column_name = 'selected_organization_id'
    ) THEN
        ALTER TABLE feed_preferences
        ADD COLUMN selected_organization_id UUID;
    END IF;
END $$;

-- Add index for better query performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_feed_preferences_selected_org_id ON feed_preferences(selected_organization_id);

-- Add foreign key constraint (only if it doesn't exist)
-- Note: This references organizations table, ensure it exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_feed_preferences_selected_org'
        AND table_name = 'feed_preferences'
    ) THEN
        ALTER TABLE feed_preferences
        ADD CONSTRAINT fk_feed_preferences_selected_org
        FOREIGN KEY (selected_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

