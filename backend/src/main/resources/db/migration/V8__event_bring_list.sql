ALTER TABLE events
ADD COLUMN IF NOT EXISTS bring_list_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS event_bring_items (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    quantity_needed INTEGER,
    allow_multiple_claims BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_bring_items_event_id ON event_bring_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bring_items_created_by ON event_bring_items(created_by);

CREATE TABLE IF NOT EXISTS event_bring_claims (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES event_bring_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    note VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_bring_claim UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_bring_claims_item_id ON event_bring_claims(item_id);
CREATE INDEX IF NOT EXISTS idx_event_bring_claims_user_id ON event_bring_claims(user_id);

