-- Add equipping gifts column to store fivefold ministry selections
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS equipping_gifts VARCHAR(255);

