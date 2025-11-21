-- =============================================================================
-- V14: Simplified 2-Tier Admin System Migration
-- =============================================================================
-- This migration implements a clear separation between:
--   1. PLATFORM_ADMIN (system-wide "Master of Everything")
--   2. ORG_ADMIN (organization-scoped administrator)
--
-- Changes:
--   - User.role: ADMIN → PLATFORM_ADMIN, MEMBER → USER
--   - UserOrganizationMembership.role: ADMIN → ORG_ADMIN
--   - Ensures every organization has at least one ORG_ADMIN
-- =============================================================================

-- Step 1: Drop existing role constraints FIRST (before updating values)
-- Drop all possible constraint names that might exist
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS constraint_4d;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_user_role;
ALTER TABLE users DROP CONSTRAINT IF EXISTS user_role_check;

-- Step 2: Update User.role enum (Platform-level roles)
-- This affects the global user role in the users table
UPDATE users 
SET role = CASE 
    WHEN role = 'ADMIN' THEN 'PLATFORM_ADMIN'
    WHEN role = 'MEMBER' THEN 'USER'
    ELSE role
END;

-- Step 3: Add new constraint with updated role names
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('USER', 'MODERATOR', 'PLATFORM_ADMIN'));

-- Step 4: Drop existing org role constraints FIRST
-- Drop all possible constraint names that might exist
ALTER TABLE user_organization_memberships DROP CONSTRAINT IF EXISTS user_organization_memberships_role_check;
ALTER TABLE user_organization_memberships DROP CONSTRAINT IF EXISTS constraint_4e;
ALTER TABLE user_organization_memberships DROP CONSTRAINT IF EXISTS chk_user_org_role;
ALTER TABLE user_organization_memberships DROP CONSTRAINT IF EXISTS user_org_role_check;

-- Step 5: Update UserOrganizationMembership.role enum (Org-level roles)
-- Rename ADMIN → ORG_ADMIN in organization memberships
UPDATE user_organization_memberships 
SET role = 'ORG_ADMIN' 
WHERE role = 'ADMIN';

-- Step 6: Add new constraint (3 roles: MEMBER, MODERATOR, ORG_ADMIN)
ALTER TABLE user_organization_memberships ADD CONSTRAINT user_organization_memberships_role_check 
    CHECK (role IN ('MEMBER', 'MODERATOR', 'ORG_ADMIN'));

-- Step 7: Ensure every organization has at least one ORG_ADMIN
-- This promotes the earliest member to ORG_ADMIN if no admin exists
WITH organizations_without_admin AS (
    SELECT DISTINCT o.id as organization_id
    FROM organizations o
    WHERE NOT EXISTS (
        SELECT 1 
        FROM user_organization_memberships uom 
        WHERE uom.organization_id = o.id 
        AND uom.role = 'ORG_ADMIN'
    )
),
first_members AS (
    SELECT DISTINCT ON (uom.organization_id) 
        uom.id
    FROM user_organization_memberships uom
    INNER JOIN organizations_without_admin owa 
        ON uom.organization_id = owa.organization_id
    ORDER BY uom.organization_id, uom.joined_at ASC
)
UPDATE user_organization_memberships
SET role = 'ORG_ADMIN'
WHERE id IN (SELECT id FROM first_members);

-- Step 8: Add index for faster admin permission checks
CREATE INDEX IF NOT EXISTS idx_user_org_membership_role 
ON user_organization_memberships(organization_id, role) 
WHERE role = 'ORG_ADMIN';

-- Step 9: Add index for user role lookups
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role) 
WHERE role IN ('PLATFORM_ADMIN', 'MODERATOR');

-- Step 10: Add repository method support - count admins per org
CREATE INDEX IF NOT EXISTS idx_user_org_count_admins
ON user_organization_memberships(organization_id) 
WHERE role = 'ORG_ADMIN';

-- Migration complete!
-- Summary of changes:
--   - User.role: ADMIN → PLATFORM_ADMIN, MEMBER → USER
--   - UserOrganizationMembership.role: ADMIN → ORG_ADMIN
--   - All organizations now have at least one ORG_ADMIN
--   - Added performance indexes for admin checks

