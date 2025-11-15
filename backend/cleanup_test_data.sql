-- ============================================================================
-- CLEANUP TEST DATA - Fresh Start for Multi-Tenant Testing
-- ============================================================================
-- This script deletes ALL user-generated test data while preserving:
-- - Database schema (tables, constraints, indexes)
-- - Global organization (00000000-0000-0000-0000-000000000001)
-- - General Discussion group
-- - Migration tracker organization
-- ============================================================================

\echo 'Starting database cleanup...'

-- ============================================================================
-- TIER 1: Leaf nodes (no foreign key dependencies)
-- ============================================================================
\echo 'Tier 1: Deleting leaf node data...'

DELETE FROM post_comment_media_types;
DELETE FROM post_comment_media_urls;
DELETE FROM post_media_types;
DELETE FROM post_media_urls;
DELETE FROM worship_song_votes;
DELETE FROM event_bring_claims;
DELETE FROM donation_subscriptions;

-- ============================================================================
-- TIER 2: Tables depending on Tier 1
-- ============================================================================
\echo 'Tier 2: Deleting dependent data...'

DELETE FROM post_comments;
DELETE FROM post_likes;
DELETE FROM post_bookmarks;
DELETE FROM post_shares;
DELETE FROM post_hashtags;
DELETE FROM prayer_interactions;
DELETE FROM worship_queue_entries;
DELETE FROM event_bring_items;
DELETE FROM messages;

-- ============================================================================
-- TIER 3: Content tables depending on Tier 2
-- ============================================================================
\echo 'Tier 3: Deleting content data...'

DELETE FROM posts;
DELETE FROM prayer_requests;
DELETE FROM announcements;
DELETE FROM audit_log_details;

-- ============================================================================
-- TIER 4: Higher-level data depending on Tier 3
-- ============================================================================
\echo 'Tier 4: Deleting higher-level data...'

DELETE FROM audit_logs;
DELETE FROM donations;
DELETE FROM events;
DELETE FROM user_organization_history;
DELETE FROM worship_room_participants;

-- ============================================================================
-- TIER 5: Worship and event data depending on Tier 4
-- ============================================================================
\echo 'Tier 5: Deleting worship and event data...'

-- Delete worship_room_settings FIRST (references worship_rooms)
DELETE FROM worship_room_settings;
DELETE FROM worship_rooms;
DELETE FROM worship_play_history;
DELETE FROM event_rsvps;

-- ============================================================================
-- TIER 6: User relationship and preference data
-- ============================================================================
\echo 'Tier 6: Deleting user relationships...'

DELETE FROM user_follows;
DELETE FROM user_group_memberships;
DELETE FROM user_organization_memberships;
DELETE FROM user_settings;
DELETE FROM feed_preferences;

-- ============================================================================
-- TIER 7: Delete all users
-- ============================================================================
\echo 'Tier 7: Deleting all users...'

-- Save the General Discussion group ID before deleting
DO $$
DECLARE
    general_discussion_id UUID;
BEGIN
    -- Store the ID for later recreation
    SELECT id INTO general_discussion_id FROM groups
    WHERE created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND name = 'General Discussion';

    -- Delete the General Discussion group temporarily
    DELETE FROM groups
    WHERE created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid
      AND name = 'General Discussion';
END $$;

-- Now we can safely delete all users
DELETE FROM users;

-- ============================================================================
-- TIER 8: Clean up orphaned organizations and groups
-- ============================================================================
\echo 'Tier 8: Cleaning up organizations and groups...'

-- Delete all groups EXCEPT the General Discussion group linked to Global org
DELETE FROM groups
WHERE created_by_org_id != '00000000-0000-0000-0000-000000000001'::uuid
   OR name != 'General Discussion';

-- Delete all organizations EXCEPT Global and Migration Tracker
DELETE FROM organizations
WHERE id NOT IN (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Global org
    '00000000-0000-0000-0000-000000000002'::uuid   -- Migration tracker
);

-- Reset member counts for Global organization
UPDATE organizations
SET member_count = 0,
    primary_member_count = 0,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Reset member count for General Discussion group
UPDATE groups
SET member_count = 0,
    updated_at = NOW()
WHERE created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND name = 'General Discussion';

-- ============================================================================
-- TIER 9: Clean up chat infrastructure
-- ============================================================================
\echo 'Tier 9: Cleaning up chat data...'

-- Delete all chat group members
DELETE FROM chat_group_members;

-- Delete all chat groups
DELETE FROM chat_groups;

-- Delete hashtags (they'll be recreated as needed)
DELETE FROM hashtags;

-- ============================================================================
-- NOTE: General Discussion Group
-- ============================================================================
-- The General Discussion group will be automatically created by the V13 migration
-- when the first user registers. No need to recreate it here.

-- ============================================================================
-- VERIFICATION
-- ============================================================================
\echo ''
\echo '============================================================================'
\echo 'CLEANUP COMPLETE! Verification:'
\echo '============================================================================'

-- Count remaining records
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Posts', COUNT(*) FROM posts
UNION ALL
SELECT 'Prayers', COUNT(*) FROM prayer_requests
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'Donations', COUNT(*) FROM donations
UNION ALL
SELECT 'Organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'Groups', COUNT(*) FROM groups
ORDER BY table_name;

\echo ''
\echo 'Preserved organizations:'
SELECT id, name, slug, type FROM organizations ORDER BY name;

\echo ''
\echo 'Preserved groups:'
SELECT id, name, type FROM groups ORDER BY name;

\echo ''
\echo '============================================================================'
\echo 'Database is now ready for fresh testing!'
\echo 'Global organization and General Discussion group have been preserved.'
\echo '============================================================================'
