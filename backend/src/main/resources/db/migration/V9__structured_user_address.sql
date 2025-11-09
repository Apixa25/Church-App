-- Structured address fields for user profiles
ALTER TABLE users
    DROP COLUMN IF EXISTS address;

ALTER TABLE users
    ADD COLUMN address_line1 VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN address_line2 VARCHAR(255),
    ADD COLUMN city VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN state_province VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN postal_code VARCHAR(20) NOT NULL DEFAULT '',
    ADD COLUMN country VARCHAR(100) NOT NULL DEFAULT 'United States',
    ADD COLUMN latitude NUMERIC(9, 6),
    ADD COLUMN longitude NUMERIC(9, 6),
    ADD COLUMN geocode_status VARCHAR(50);

