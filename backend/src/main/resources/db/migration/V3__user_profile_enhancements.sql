-- User Profile Enhancements Migration
-- Version 3: Adding phone number, address, birthday, and spiritual gift fields to users table

-- ===================================================
-- ADD NEW COLUMNS TO USERS TABLE
-- ===================================================

-- Add phone number field (max 20 characters)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add address field (max 500 characters for full address)
ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(500);

-- Add birthday field (DATE type)
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add spiritual gift field (max 255 characters)
ALTER TABLE users ADD COLUMN IF NOT EXISTS spiritual_gift VARCHAR(255);

-- ===================================================
-- ADD INDEXES FOR NEW FIELDS (if needed for queries)
-- ===================================================

-- Index for birthday (useful for birthday notifications/queries)
CREATE INDEX IF NOT EXISTS idx_users_birthday ON users(birthday);

-- Index for spiritual gift (useful for finding people with specific gifts)
CREATE INDEX IF NOT EXISTS idx_users_spiritual_gift ON users(spiritual_gift);

-- ===================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ===================================================

COMMENT ON COLUMN users.phone_number IS 'User phone number for contact purposes';
COMMENT ON COLUMN users.address IS 'User home address for location-based features';
COMMENT ON COLUMN users.birthday IS 'User birthday for celebrations and age-based features';
COMMENT ON COLUMN users.spiritual_gift IS 'User spiritual gifts for ministry matching';

