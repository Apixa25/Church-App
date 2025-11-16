-- Add logo_url column to organizations table
-- This allows organizations to have custom logos for branding
-- Version 14: Adding logo_url field to organizations table

-- ============================================================================
-- ADD LOGO URL COLUMN TO ORGANIZATIONS TABLE
-- ============================================================================

-- Add logo image URL field (max 500 characters)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN organizations.logo_url IS 'Organization logo image URL for branding and dashboard display. Stored in S3 bucket under organizations/logos/ folder.';

