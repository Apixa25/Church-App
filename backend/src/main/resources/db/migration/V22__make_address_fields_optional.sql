-- Make address fields optional (nullable) in users table
-- This allows users to save their profile without providing address information
-- Version 22: Making address fields optional

ALTER TABLE users
    ALTER COLUMN address_line1 DROP NOT NULL,
    ALTER COLUMN city DROP NOT NULL,
    ALTER COLUMN state_province DROP NOT NULL,
    ALTER COLUMN postal_code DROP NOT NULL,
    ALTER COLUMN country DROP NOT NULL;

-- Remove default values since fields are now nullable
ALTER TABLE users
    ALTER COLUMN address_line1 DROP DEFAULT,
    ALTER COLUMN city DROP DEFAULT,
    ALTER COLUMN state_province DROP DEFAULT,
    ALTER COLUMN postal_code DROP DEFAULT,
    ALTER COLUMN country DROP DEFAULT;

-- Set country default back (but nullable) for convenience
ALTER TABLE users
    ALTER COLUMN country SET DEFAULT 'United States';



















