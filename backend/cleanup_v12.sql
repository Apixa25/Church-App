-- Cleanup script for partial V12 migration
-- Run this to clean up any partially created V12 objects before re-running migration

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS feed_preferences CASCADE;
DROP TABLE IF EXISTS user_group_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS user_organization_history CASCADE;
DROP TABLE IF EXISTS user_organization_memberships CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop columns added to existing tables
ALTER TABLE users DROP COLUMN IF EXISTS primary_organization_id CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS created_via;
ALTER TABLE users DROP COLUMN IF EXISTS last_org_switch_at;

ALTER TABLE posts DROP COLUMN IF EXISTS organization_id CASCADE;
ALTER TABLE posts DROP COLUMN IF EXISTS group_id CASCADE;
ALTER TABLE posts DROP COLUMN IF EXISTS user_primary_org_id_snapshot;
ALTER TABLE posts DROP COLUMN IF EXISTS visibility;

ALTER TABLE prayer_requests DROP COLUMN IF EXISTS organization_id CASCADE;

ALTER TABLE events DROP COLUMN IF EXISTS organization_id CASCADE;

ALTER TABLE announcements DROP COLUMN IF EXISTS organization_id CASCADE;

ALTER TABLE donations DROP COLUMN IF EXISTS organization_id CASCADE;

ALTER TABLE donation_subscriptions DROP COLUMN IF EXISTS organization_id CASCADE;

-- Success message
SELECT 'V12 cleanup completed successfully!' AS status;
