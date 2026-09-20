-- ============================================================================
-- Migration: Organization location/denomination + flexible feed scope
-- Version: V53
-- Description:
--   1. Adds denomination, structured address, coordinates and discoverability
--      to organizations so churches can be found by "nearby" / "same
--      denomination" feed scopes.
--   2. Adds a JSONB FeedScope to feed_preferences and allows the new CUSTOM
--      filter value. Existing filter values and columns are untouched.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Organizations: denomination, address, coordinates, discoverability
-- ---------------------------------------------------------------------------
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS denomination VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_province VARCHAR(100),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'United States',
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS geocode_status VARCHAR(50),
    ADD COLUMN IF NOT EXISTS discoverable BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_organizations_coordinates
    ON organizations (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_organizations_denomination
    ON organizations (denomination);

COMMENT ON COLUMN organizations.denomination IS 'Denomination label (e.g. Baptist, Methodist). Used by same-denomination feed scopes.';
COMMENT ON COLUMN organizations.discoverable IS 'When false the organization is never returned by nearby/denomination discovery.';
COMMENT ON COLUMN organizations.geocode_status IS 'GEOCODED | GPS_CAPTURED | MANUAL | FAILED | PENDING';

-- ---------------------------------------------------------------------------
-- 2. Feed preferences: flexible scope + CUSTOM filter
-- ---------------------------------------------------------------------------
ALTER TABLE feed_preferences
    ADD COLUMN IF NOT EXISTS scope_json JSONB,
    ADD COLUMN IF NOT EXISTS scope_description TEXT,
    ADD COLUMN IF NOT EXISTS scope_source_text TEXT;

ALTER TABLE feed_preferences DROP CONSTRAINT IF EXISTS chk_feed_preferences_filter;

ALTER TABLE feed_preferences ADD CONSTRAINT chk_feed_preferences_filter
    CHECK (active_filter IN ('EVERYTHING', 'ALL', 'PRIMARY_ONLY', 'SELECTED_GROUPS', 'CUSTOM'));

COMMENT ON COLUMN feed_preferences.scope_json IS 'Structured FeedScope used when active_filter = CUSTOM.';
COMMENT ON COLUMN feed_preferences.scope_description IS 'Human readable summary of the active scope (e.g. "First Baptist + Smith Family").';
COMMENT ON COLUMN feed_preferences.scope_source_text IS 'Natural language text the user typed to produce the scope, if any.';
