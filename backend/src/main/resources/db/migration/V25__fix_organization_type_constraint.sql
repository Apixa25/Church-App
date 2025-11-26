-- ============================================================================
-- V25: FIX ORGANIZATION TYPE CONSTRAINT FOR FAMILY ORGANIZATIONS
-- ============================================================================
-- This fixes an issue where V24 tried to drop constraints with wrong names.
-- The original constraint was named chk_organizations_type (from V12)
-- but V24 tried to drop chk_org_type and organizations_type_check.
--
-- This migration:
-- 1. Drops the old chk_organizations_type constraint that doesn't include FAMILY
-- 2. Re-adds the constraint with FAMILY and GENERAL types included
-- ============================================================================

-- Drop the old constraint (from V12)
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_type;

-- Also drop any other variations just to be safe
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_org_type;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_type_check;

-- Add the updated constraint with ALL valid types including FAMILY
ALTER TABLE organizations ADD CONSTRAINT chk_organizations_type 
    CHECK (type IN ('CHURCH', 'MINISTRY', 'NONPROFIT', 'FAMILY', 'GENERAL', 'GLOBAL'));

-- ============================================================================
-- NOTES:
-- ============================================================================
-- Valid organization types:
-- - CHURCH: Churches and places of worship
-- - MINISTRY: Ministry organizations
-- - NONPROFIT: Non-profit organizations  
-- - FAMILY: Family groups (for Family Primary slot)
-- - GENERAL: General/other organizations
-- - GLOBAL: The global "The Gathering" organization
-- ============================================================================

