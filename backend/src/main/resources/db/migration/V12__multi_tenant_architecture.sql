-- Multi-Tenant Group-Based Architecture Migration
-- Transforms the app to support:
-- 1. Organizations (Primary Tenant Groups - churches, ministries)
-- 2. User-created groups (cross-org, public, private)
-- 3. Flexible group memberships with feed filtering
-- 4. Organization-scoped content (prayers, events, donations)

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
CREATE TABLE organizations (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    stripe_connect_account_id VARCHAR(255),
    subscription_expires_at TIMESTAMP,
    settings JSONB,
    metadata JSONB,
    parent_organization_id UUID,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

ALTER TABLE organizations ADD CONSTRAINT pk_organizations PRIMARY KEY(id);
ALTER TABLE organizations ADD CONSTRAINT uk_organizations_slug UNIQUE(slug);
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_parent
    FOREIGN KEY(parent_organization_id) REFERENCES organizations(id);
ALTER TABLE organizations ADD CONSTRAINT chk_organizations_type
    CHECK(type IN('CHURCH', 'MINISTRY', 'NONPROFIT', 'GLOBAL'));
ALTER TABLE organizations ADD CONSTRAINT chk_organizations_tier
    CHECK(tier IN('BASIC', 'PREMIUM'));
ALTER TABLE organizations ADD CONSTRAINT chk_organizations_status
    CHECK(status IN('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'));

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_parent ON organizations(parent_organization_id);

-- ============================================================================
-- USER ORGANIZATION MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE user_organization_memberships (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

ALTER TABLE user_organization_memberships ADD CONSTRAINT pk_user_org_memberships PRIMARY KEY(id);
ALTER TABLE user_organization_memberships ADD CONSTRAINT uk_user_org
    UNIQUE(user_id, organization_id);
ALTER TABLE user_organization_memberships ADD CONSTRAINT fk_user_org_user
    FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE user_organization_memberships ADD CONSTRAINT fk_user_org_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);
ALTER TABLE user_organization_memberships ADD CONSTRAINT chk_user_org_role
    CHECK(role IN('MEMBER', 'MODERATOR', 'ADMIN'));

CREATE INDEX idx_user_org_user_id ON user_organization_memberships(user_id);
CREATE INDEX idx_user_org_organization_id ON user_organization_memberships(organization_id);
CREATE INDEX idx_user_org_is_primary ON user_organization_memberships(is_primary);

-- ============================================================================
-- USER ORGANIZATION HISTORY TABLE
-- ============================================================================
CREATE TABLE user_organization_history (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    from_organization_id UUID,
    to_organization_id UUID,
    switched_at TIMESTAMP NOT NULL,
    reason TEXT
);

ALTER TABLE user_organization_history ADD CONSTRAINT pk_user_org_history PRIMARY KEY(id);
ALTER TABLE user_organization_history ADD CONSTRAINT fk_user_org_history_user
    FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE user_organization_history ADD CONSTRAINT fk_user_org_history_from
    FOREIGN KEY(from_organization_id) REFERENCES organizations(id);
ALTER TABLE user_organization_history ADD CONSTRAINT fk_user_org_history_to
    FOREIGN KEY(to_organization_id) REFERENCES organizations(id);

CREATE INDEX idx_user_org_history_user_id ON user_organization_history(user_id);
CREATE INDEX idx_user_org_history_switched_at ON user_organization_history(switched_at);

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================
CREATE TABLE groups (
    id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_by_org_id UUID,
    tags JSONB,
    allowed_org_ids JSONB,
    settings JSONB,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

ALTER TABLE groups ADD CONSTRAINT pk_groups PRIMARY KEY(id);
ALTER TABLE groups ADD CONSTRAINT fk_groups_created_by_user
    FOREIGN KEY(created_by_user_id) REFERENCES users(id);
ALTER TABLE groups ADD CONSTRAINT fk_groups_created_by_org
    FOREIGN KEY(created_by_org_id) REFERENCES organizations(id);
ALTER TABLE groups ADD CONSTRAINT chk_groups_type
    CHECK(type IN('PUBLIC', 'ORG_PRIVATE', 'CROSS_ORG', 'INVITE_ONLY'));

CREATE INDEX idx_groups_type ON groups(type);
CREATE INDEX idx_groups_created_by_user ON groups(created_by_user_id);
CREATE INDEX idx_groups_created_by_org ON groups(created_by_org_id);
CREATE INDEX idx_groups_created_at ON groups(created_at);

-- ============================================================================
-- USER GROUP MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE user_group_memberships (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    group_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

ALTER TABLE user_group_memberships ADD CONSTRAINT pk_user_group_memberships PRIMARY KEY(id);
ALTER TABLE user_group_memberships ADD CONSTRAINT uk_user_group
    UNIQUE(user_id, group_id);
ALTER TABLE user_group_memberships ADD CONSTRAINT fk_user_group_user
    FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE user_group_memberships ADD CONSTRAINT fk_user_group_group
    FOREIGN KEY(group_id) REFERENCES groups(id);
ALTER TABLE user_group_memberships ADD CONSTRAINT chk_user_group_role
    CHECK(role IN('MEMBER', 'MODERATOR', 'CREATOR'));

CREATE INDEX idx_user_group_user_id ON user_group_memberships(user_id);
CREATE INDEX idx_user_group_group_id ON user_group_memberships(group_id);
CREATE INDEX idx_user_group_is_muted ON user_group_memberships(is_muted);

-- ============================================================================
-- FEED PREFERENCES TABLE
-- ============================================================================
CREATE TABLE feed_preferences (
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    active_filter VARCHAR(30) NOT NULL,
    selected_group_ids JSONB,
    updated_at TIMESTAMP NOT NULL
);

ALTER TABLE feed_preferences ADD CONSTRAINT pk_feed_preferences PRIMARY KEY(id);
ALTER TABLE feed_preferences ADD CONSTRAINT uk_feed_preferences_user UNIQUE(user_id);
ALTER TABLE feed_preferences ADD CONSTRAINT fk_feed_preferences_user
    FOREIGN KEY(user_id) REFERENCES users(id);
ALTER TABLE feed_preferences ADD CONSTRAINT chk_feed_preferences_filter
    CHECK(active_filter IN('ALL', 'PRIMARY_ONLY', 'SELECTED_GROUPS'));

CREATE INDEX idx_feed_preferences_user_id ON feed_preferences(user_id);

-- ============================================================================
-- UPDATE EXISTING USERS TABLE
-- ============================================================================
ALTER TABLE users ADD COLUMN primary_organization_id UUID;
ALTER TABLE users ADD COLUMN created_via VARCHAR(100);
ALTER TABLE users ADD COLUMN last_org_switch_at TIMESTAMP;

ALTER TABLE users ADD CONSTRAINT fk_users_primary_org
    FOREIGN KEY(primary_organization_id) REFERENCES organizations(id);

CREATE INDEX idx_users_primary_org ON users(primary_organization_id);
CREATE INDEX idx_users_last_org_switch ON users(last_org_switch_at);

-- ============================================================================
-- UPDATE EXISTING POSTS TABLE
-- ============================================================================
ALTER TABLE posts ADD COLUMN organization_id UUID;
ALTER TABLE posts ADD COLUMN group_id UUID;
ALTER TABLE posts ADD COLUMN user_primary_org_id_snapshot UUID;
ALTER TABLE posts ADD COLUMN visibility VARCHAR(20) DEFAULT 'PUBLIC';

ALTER TABLE posts ADD CONSTRAINT fk_posts_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);
ALTER TABLE posts ADD CONSTRAINT fk_posts_group
    FOREIGN KEY(group_id) REFERENCES groups(id);
ALTER TABLE posts ADD CONSTRAINT chk_posts_visibility
    CHECK(visibility IN('PUBLIC', 'ORG_ONLY'));

CREATE INDEX idx_posts_organization_id ON posts(organization_id);
CREATE INDEX idx_posts_group_id ON posts(group_id);
CREATE INDEX idx_posts_user_primary_org_snapshot ON posts(user_primary_org_id_snapshot);
CREATE INDEX idx_posts_org_created ON posts(organization_id, created_at DESC);
CREATE INDEX idx_posts_group_created ON posts(group_id, created_at DESC);

-- ============================================================================
-- UPDATE EXISTING PRAYER_REQUESTS TABLE
-- ============================================================================
ALTER TABLE prayer_requests ADD COLUMN organization_id UUID;

ALTER TABLE prayer_requests ADD CONSTRAINT fk_prayers_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);

CREATE INDEX idx_prayers_organization_id ON prayer_requests(organization_id);
CREATE INDEX idx_prayers_org_created ON prayer_requests(organization_id, created_at DESC);
CREATE INDEX idx_prayers_org_status ON prayer_requests(organization_id, status);

-- ============================================================================
-- UPDATE EXISTING EVENTS TABLE
-- ============================================================================
ALTER TABLE events ADD COLUMN organization_id UUID;

ALTER TABLE events ADD CONSTRAINT fk_events_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);

CREATE INDEX idx_events_organization_id ON events(organization_id);
CREATE INDEX idx_events_org_start_time ON events(organization_id, start_time);
CREATE INDEX idx_events_org_status ON events(organization_id, status);

-- ============================================================================
-- UPDATE EXISTING ANNOUNCEMENTS TABLE
-- ============================================================================
ALTER TABLE announcements ADD COLUMN organization_id UUID;

ALTER TABLE announcements ADD CONSTRAINT fk_announcements_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);

CREATE INDEX idx_announcements_organization_id ON announcements(organization_id);
CREATE INDEX idx_announcements_org_created ON announcements(organization_id, created_at DESC);
CREATE INDEX idx_announcements_org_pinned ON announcements(organization_id, is_pinned);

-- ============================================================================
-- UPDATE EXISTING DONATIONS TABLE
-- ============================================================================
ALTER TABLE donations ADD COLUMN organization_id UUID;

ALTER TABLE donations ADD CONSTRAINT fk_donations_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);

CREATE INDEX idx_donations_organization_id ON donations(organization_id);
CREATE INDEX idx_donations_org_timestamp ON donations(organization_id, timestamp DESC);
CREATE INDEX idx_donations_org_user ON donations(organization_id, user_id);

-- ============================================================================
-- UPDATE EXISTING DONATION_SUBSCRIPTIONS TABLE
-- ============================================================================
ALTER TABLE donation_subscriptions ADD COLUMN organization_id UUID;

ALTER TABLE donation_subscriptions ADD CONSTRAINT fk_donation_subs_organization
    FOREIGN KEY(organization_id) REFERENCES organizations(id);

CREATE INDEX idx_donation_subs_organization_id ON donation_subscriptions(organization_id);

-- ============================================================================
-- SEED DATA: CREATE "THE GATHERING" GLOBAL ORGANIZATION
-- ============================================================================
INSERT INTO organizations (
    id,
    name,
    slug,
    type,
    tier,
    status,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'The Gathering',
    'the-gathering',
    'GLOBAL',
    'BASIC',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- ============================================================================
-- DATA MIGRATION: ASSIGN EXISTING POSTS TO GLOBAL ORG
-- ============================================================================
UPDATE posts
SET organization_id = '00000000-0000-0000-0000-000000000001',
    visibility = 'PUBLIC'
WHERE organization_id IS NULL;

-- Note: Prayer requests, events, and announcements will remain NULL
-- until users join a Primary Organization. Existing data can be cleaned up
-- or migrated based on business rules.

