-- Organization Metrics History Table
-- Stores historical snapshots of organization metrics for trending and analytics

CREATE TABLE organization_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Store full metrics snapshot as JSONB for flexibility
    -- This allows us to add new metrics without schema changes
    metrics_snapshot JSONB NOT NULL,
    
    -- Timestamp when this snapshot was recorded
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_metrics_history_org_id ON organization_metrics_history(organization_id);
CREATE INDEX idx_metrics_history_recorded_at ON organization_metrics_history(recorded_at DESC);
CREATE INDEX idx_metrics_history_org_recorded ON organization_metrics_history(organization_id, recorded_at DESC);

-- Composite index for time-range queries per organization
CREATE INDEX idx_metrics_history_org_time_range ON organization_metrics_history(organization_id, recorded_at);

-- Add comments for documentation
COMMENT ON TABLE organization_metrics_history IS 'Historical snapshots of organization metrics for trending and analytics';
COMMENT ON COLUMN organization_metrics_history.organization_id IS 'Reference to the organization this snapshot belongs to';
COMMENT ON COLUMN organization_metrics_history.metrics_snapshot IS 'JSONB object containing all metrics at the time of snapshot (storage, network, activity)';
COMMENT ON COLUMN organization_metrics_history.recorded_at IS 'Timestamp when this metrics snapshot was recorded';

