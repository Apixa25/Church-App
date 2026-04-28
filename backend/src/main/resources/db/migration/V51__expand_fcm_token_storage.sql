-- Real push notification tokens can exceed 500 characters, especially web/mobile
-- Firebase registration tokens. Store them as TEXT so token registration does not
-- fail when a device returns a longer token.
ALTER TABLE users
    ALTER COLUMN fcm_token TYPE TEXT;

ALTER TABLE user_settings
    ALTER COLUMN fcm_token TYPE TEXT;
