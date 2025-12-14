-- Add FCM token column to users table for push notifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500);

-- Create index for faster FCM token lookups
CREATE INDEX IF NOT EXISTS idx_user_fcm_token ON users(fcm_token);

-- Add comment to document the column
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
