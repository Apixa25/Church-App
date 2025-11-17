-- Organization Metrics Table
-- Tracks storage, network traffic, and user activity metrics per organization

CREATE TABLE organization_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Storage metrics (in bytes)
    storage_used BIGINT DEFAULT 0,
    storage_media_files BIGINT DEFAULT 0,
    storage_documents BIGINT DEFAULT 0,
    storage_profile_pics BIGINT DEFAULT 0,
    
    -- Network metrics
    api_requests_count INTEGER DEFAULT 0,
    data_transfer_bytes BIGINT DEFAULT 0,
    
    -- Activity metrics
    active_users_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    prayer_requests_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    announcements_count INTEGER DEFAULT 0,
    
    -- Timestamps
    calculated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_org_metrics_org_id ON organization_metrics(organization_id);
CREATE INDEX idx_org_metrics_calculated_at ON organization_metrics(calculated_at DESC);
CREATE UNIQUE INDEX idx_org_metrics_org_unique ON organization_metrics(organization_id);

-- Add comment for documentation
COMMENT ON TABLE organization_metrics IS 'Tracks storage, network traffic, and activity metrics for each organization';
COMMENT ON COLUMN organization_metrics.storage_used IS 'Total storage used in bytes (media + documents + profile pics)';
COMMENT ON COLUMN organization_metrics.storage_media_files IS 'Storage used by media files (posts, announcements) in bytes';
COMMENT ON COLUMN organization_metrics.storage_documents IS 'Storage used by documents (resources library) in bytes';
COMMENT ON COLUMN organization_metrics.storage_profile_pics IS 'Storage used by profile pictures in bytes';
COMMENT ON COLUMN organization_metrics.api_requests_count IS 'Total number of API requests made by organization users';
COMMENT ON COLUMN organization_metrics.data_transfer_bytes IS 'Total data transfer in bytes (requests + responses)';
COMMENT ON COLUMN organization_metrics.active_users_count IS 'Number of users who logged in within the last 30 days';
COMMENT ON COLUMN organization_metrics.posts_count IS 'Total number of posts created by organization';
COMMENT ON COLUMN organization_metrics.prayer_requests_count IS 'Total number of prayer requests created by organization';
COMMENT ON COLUMN organization_metrics.events_count IS 'Total number of events created by organization';
COMMENT ON COLUMN organization_metrics.announcements_count IS 'Total number of announcements created by organization';
COMMENT ON COLUMN organization_metrics.calculated_at IS 'Timestamp when metrics were last calculated';

