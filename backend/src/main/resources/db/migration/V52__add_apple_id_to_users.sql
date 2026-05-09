-- Add Apple ID column for Sign in with Apple support
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_user_apple_id ON users(apple_id);
