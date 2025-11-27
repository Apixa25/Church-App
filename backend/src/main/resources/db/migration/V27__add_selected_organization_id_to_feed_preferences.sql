-- Add selected_organization_id column to feed_preferences table
-- This allows filtering by a specific organization when PRIMARY_ONLY filter is selected
-- Supports dual-primary system where users can filter by either churchPrimary or familyPrimary

ALTER TABLE feed_preferences
ADD COLUMN selected_organization_id UUID;

-- Add index for better query performance
CREATE INDEX idx_feed_preferences_selected_org_id ON feed_preferences(selected_organization_id);

-- Add foreign key constraint (optional, but good for data integrity)
-- Note: This references organizations table, ensure it exists
ALTER TABLE feed_preferences
ADD CONSTRAINT fk_feed_preferences_selected_org
FOREIGN KEY (selected_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

