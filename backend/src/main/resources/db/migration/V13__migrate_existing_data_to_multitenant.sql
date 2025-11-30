-- V13: Migrate existing data to multi-tenant structure
--
-- This migration creates a default "Global" organization and migrates all existing
-- users and content to use the multi-tenant system.

-- Step 1: Create the Global organization
-- This is the default organization for all existing users and content
INSERT INTO organizations (
    id,
    name,
    slug,
    type,
    tier,
    status,
    settings,
    metadata,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'The Gathering Community',
    'global',
    'GLOBAL',
    'PREMIUM',
    'ACTIVE',
    '{"website": "https://thegathering.com", "description": "The Global Gathering Community"}'::jsonb,
    jsonb_build_object('isDefault', true, 'migratedAt', NOW()::text),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 2: Create primary organization memberships for all existing users
-- All existing users become members of the Global organization with their existing role
INSERT INTO user_organization_memberships (
    id,
    user_id,
    organization_id,
    role,
    is_primary,
    joined_at,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    CASE
        WHEN u.role = 'ADMIN' THEN 'ADMIN'
        WHEN u.role = 'MODERATOR' THEN 'MODERATOR'
        ELSE 'MEMBER'
    END,
    true,  -- All existing users get Global as their primary org
    u.created_at,
    NOW(),
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_organization_memberships uom
    WHERE uom.user_id = u.id
    AND uom.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Step 3: Update all existing posts to be associated with the Global organization
UPDATE posts
SET
    organization_id = '00000000-0000-0000-0000-000000000001'::uuid,
    user_primary_org_id_snapshot = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Step 4: Update all existing prayer requests to be associated with the Global organization
UPDATE prayer_requests
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Step 5: Update all existing events to be associated with the Global organization
UPDATE events
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Step 6: Update all existing announcements to be associated with the Global organization
UPDATE announcements
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Step 7: Update all existing donations to be associated with the Global organization
UPDATE donations
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Step 8: Update the User entity to set primary organization
-- This assumes users table has a primary_organization_id column
-- If not, this step can be skipped as the relationship is managed via user_organization_memberships
UPDATE users u
SET primary_organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE primary_organization_id IS NULL
AND EXISTS (
    SELECT 1 FROM user_organization_memberships uom
    WHERE uom.user_id = u.id
    AND uom.organization_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND uom.is_primary = true
);

-- Step 9: Create feed preferences for all existing users
-- Default to "ALL" filter which shows everything
INSERT INTO feed_preferences (
    id,
    user_id,
    active_filter,
    selected_group_ids,
    updated_at,
    created_at
)
SELECT
    gen_random_uuid(),
    u.id,
    'ALL',
    '[]'::jsonb,
    NOW(),
    NOW()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM feed_preferences fp
    WHERE fp.user_id = u.id
);

-- Step 10: Create a default "General" group for the Global organization
-- This provides a default group for community discussions
-- Only create if users exist (for fresh databases, this will be skipped and created when first user registers)
INSERT INTO groups (
    id,
    name,
    description,
    type,
    created_by_org_id,
    created_by_user_id,
    tags,
    settings,
    member_count,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    'General Discussion',
    'A place for general community discussions and fellowship',
    'PUBLIC',
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1),
    '["general", "community", "fellowship"]'::jsonb,
    '{}'::jsonb,
    0,
    NOW(),
    NOW()
WHERE EXISTS (
    SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1
)
AND NOT EXISTS (
    SELECT 1 FROM groups
    WHERE created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND name = 'General Discussion'
);

-- Step 11: Add all existing users to the General Discussion group
-- This ensures everyone can participate in community discussions
INSERT INTO user_group_memberships (
    id,
    user_id,
    group_id,
    role,
    is_muted,
    joined_at,
    created_at
)
SELECT
    gen_random_uuid(),
    u.id,
    g.id,
    CASE
        WHEN u.role = 'ADMIN' THEN 'CREATOR'
        WHEN u.role = 'MODERATOR' THEN 'MODERATOR'
        ELSE 'MEMBER'
    END,
    false,  -- Not muted by default
    NOW(),
    NOW()
FROM
    users u
    CROSS JOIN groups g
WHERE
    g.name = 'General Discussion'
    AND g.created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (
        SELECT 1 FROM user_group_memberships ugm
        WHERE ugm.user_id = u.id
        AND ugm.group_id = g.id
    );

-- Step 12: Update statistics for the Global organization
-- Calculate member counts
UPDATE organizations o
SET
    member_count = (
        SELECT COUNT(*)
        FROM user_organization_memberships uom
        WHERE uom.organization_id = o.id
    ),
    primary_member_count = (
        SELECT COUNT(*)
        FROM user_organization_memberships uom
        WHERE uom.organization_id = o.id AND uom.is_primary = true
    ),
    updated_at = NOW()
WHERE o.id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 13: Update member counts for all groups
UPDATE groups g
SET
    member_count = (
        SELECT COUNT(*)
        FROM user_group_memberships ugm
        WHERE ugm.group_id = g.id
    ),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM user_group_memberships ugm
    WHERE ugm.group_id = g.id
);

-- Step 14: Log migration completion
-- Create a metadata entry to track that migration has been completed
INSERT INTO organizations (
    id,
    name,
    slug,
    type,
    tier,
    status,
    settings,
    metadata,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'Migration Tracker',
    'migration-tracker',
    'GLOBAL',
    'BASIC',
    'ACTIVE',
    '{}'::jsonb,
    jsonb_build_object(
        'isMigrationTracker', true,
        'migrationVersion', 'V13',
        'migrationCompletedAt', NOW()::text,
        'usersMigrated', (SELECT COUNT(*) FROM users),
        'postsMigrated', (SELECT COUNT(*) FROM posts WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid),
        'prayersMigrated', (SELECT COUNT(*) FROM prayer_requests WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid),
        'eventsMigrated', (SELECT COUNT(*) FROM events WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid),
        'announcementsMigrated', (SELECT COUNT(*) FROM announcements WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid),
        'donationsMigrated', (SELECT COUNT(*) FROM donations WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid)
    ),
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE
SET metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- Migration complete!
-- All existing users are now members of the Global organization
-- All existing content is now associated with the Global organization
-- Users can now join additional organizations and groups
