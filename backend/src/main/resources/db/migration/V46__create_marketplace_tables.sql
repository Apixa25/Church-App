CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    section_type VARCHAR(30) NOT NULL,
    post_type VARCHAR(20) NOT NULL,
    title VARCHAR(140) NOT NULL,
    description TEXT,
    category VARCHAR(80),
    item_condition VARCHAR(40),
    price_amount DECIMAL(12,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    location_label VARCHAR(255),
    distance_radius_km INTEGER,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INTEGER NOT NULL DEFAULT 0,
    interest_count INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marketplace_listing_images (
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL,
    image_url VARCHAR(1024) NOT NULL,
    PRIMARY KEY (listing_id, display_order)
);

CREATE TABLE marketplace_listing_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_marketplace_interest_listing_user UNIQUE (listing_id, user_id)
);

CREATE INDEX idx_marketplace_section_status_created
    ON marketplace_listings (section_type, status, created_at DESC);
CREATE INDEX idx_marketplace_organization_status
    ON marketplace_listings (organization_id, status);
CREATE INDEX idx_marketplace_owner
    ON marketplace_listings (owner_user_id);
CREATE INDEX idx_marketplace_status
    ON marketplace_listings (status);
CREATE INDEX idx_marketplace_created_at
    ON marketplace_listings (created_at DESC);

CREATE INDEX idx_marketplace_interest_listing
    ON marketplace_listing_interests (listing_id);
CREATE INDEX idx_marketplace_interest_user
    ON marketplace_listing_interests (user_id);
