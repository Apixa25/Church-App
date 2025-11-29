-- ============================================================================
-- V32: ORGANIZATION GROUPS FEATURE
-- ============================================================================
-- This migration adds support for users to follow organizations as groups
-- (feed-only view) and tracks group creation limits.
--
-- Changes:
-- 1. Create user_organization_groups table to track orgs followed as groups
-- 2. Create user_group_creation_log table to track group creation limits
-- ============================================================================

-- ============================================================================
-- Table: user_organization_groups
-- Purpose: Track which organizations users follow as groups (feed-only view)
-- ============================================================================
CREATE TABLE user_organization_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Ensure user can only follow an org once
    CONSTRAINT uk_user_org_group UNIQUE (user_id, organization_id)
);

-- Indexes for performance
CREATE INDEX idx_user_org_groups_user_id ON user_organization_groups(user_id);
CREATE INDEX idx_user_org_groups_org_id ON user_organization_groups(organization_id);
CREATE INDEX idx_user_org_groups_is_muted ON user_organization_groups(is_muted);
CREATE INDEX idx_user_org_groups_joined_at ON user_organization_groups(joined_at);

-- ============================================================================
-- Table: user_group_creation_log
-- Purpose: Track group creation to enforce 3 groups per month limit
-- ============================================================================
CREATE TABLE user_group_creation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_group_creation_user_id ON user_group_creation_log(user_id);
CREATE INDEX idx_user_group_creation_created_at ON user_group_creation_log(created_at);

-- Composite index for monthly queries
CREATE INDEX idx_user_group_creation_user_date ON user_group_creation_log(user_id, created_at);

