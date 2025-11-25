-- ============================================================================
-- V24: DUAL PRIMARY ORGANIZATIONS SYSTEM
-- ============================================================================
-- This migration implements the dual primary organization system where users
-- can have both a Church Primary and a Family Primary organization.
--
-- Changes:
-- 1. Rename primary_organization_id to church_primary_organization_id
-- 2. Add family_primary_organization_id column
-- 3. Remove cooldown column (no longer needed - users can switch freely)
-- 4. Add new organization types: FAMILY, GENERAL
-- ============================================================================

-- Step 1: Rename existing primary_organization_id to church_primary_organization_id
-- First drop the foreign key constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_user_primary_org;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_primary_organization_id_fkey;

-- Rename the column
ALTER TABLE users RENAME COLUMN primary_organization_id TO church_primary_organization_id;

-- Re-add the foreign key constraint with new name
ALTER TABLE users ADD CONSTRAINT fk_users_church_primary_org 
    FOREIGN KEY (church_primary_organization_id) REFERENCES organizations(id);

-- Step 2: Add family_primary_organization_id column
ALTER TABLE users ADD COLUMN family_primary_organization_id UUID;

-- Add foreign key constraint for family organization
ALTER TABLE users ADD CONSTRAINT fk_users_family_primary_org 
    FOREIGN KEY (family_primary_organization_id) REFERENCES organizations(id);

-- Create index for performance on family organization lookups
CREATE INDEX idx_users_family_primary_org ON users(family_primary_organization_id);

-- Step 3: Remove cooldown column (no longer needed - users can switch freely!)
-- This enables real-life church experience where people can come and go freely
ALTER TABLE users DROP COLUMN IF EXISTS last_org_switch_at;

-- Step 4: Update organization type constraint to include new types
-- The constraint may or may not exist depending on how the table was created
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_org_type;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_type_check;

-- Add updated constraint with new types
ALTER TABLE organizations ADD CONSTRAINT chk_org_type 
    CHECK (type IN ('CHURCH', 'MINISTRY', 'NONPROFIT', 'FAMILY', 'GENERAL', 'GLOBAL'));

-- Step 5: Update user_organization_memberships to track slot type (church vs family)
-- This helps us know if a membership is for the church slot or family slot
ALTER TABLE user_organization_memberships ADD COLUMN IF NOT EXISTS slot_type VARCHAR(20);

-- Add constraint for slot_type values
ALTER TABLE user_organization_memberships DROP CONSTRAINT IF EXISTS chk_membership_slot_type;
ALTER TABLE user_organization_memberships ADD CONSTRAINT chk_membership_slot_type 
    CHECK (slot_type IS NULL OR slot_type IN ('CHURCH', 'FAMILY', 'GROUP'));

-- Create index for slot_type queries
CREATE INDEX IF NOT EXISTS idx_user_org_memberships_slot_type 
    ON user_organization_memberships(slot_type);

-- ============================================================================
-- MIGRATION NOTES:
-- ============================================================================
-- After this migration:
-- - Users can have TWO primary organizations: church_primary_organization_id and family_primary_organization_id
-- - Church Primary slot accepts: CHURCH, MINISTRY, NONPROFIT, GENERAL
-- - Family Primary slot accepts: FAMILY only
-- - All other memberships are "Groups" (social feed only access)
-- - No more 30-day cooldown - users can switch primaries freely!
-- ============================================================================

