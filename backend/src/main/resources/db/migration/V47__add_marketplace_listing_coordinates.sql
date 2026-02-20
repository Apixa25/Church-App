ALTER TABLE marketplace_listings
    ADD COLUMN latitude DECIMAL(9,6),
    ADD COLUMN longitude DECIMAL(9,6),
    ADD COLUMN location_source VARCHAR(30),
    ADD COLUMN geocode_status VARCHAR(50);

CREATE INDEX idx_marketplace_coordinates
    ON marketplace_listings (latitude, longitude);
