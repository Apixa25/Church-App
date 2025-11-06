-- User Profile Banner Image Migration
-- Version 5: Adding banner_image_url field to users table

-- ===================================================
-- ADD BANNER IMAGE COLUMN TO USERS TABLE
-- ===================================================

-- Add banner image URL field (max 500 characters)
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_image_url VARCHAR(500);

-- ===================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ===================================================

COMMENT ON COLUMN users.banner_image_url IS 'User profile banner image URL for profile header display';

COMMIT;

