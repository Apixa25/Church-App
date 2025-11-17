-- Add storage limit fields to organizations
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS storage_alert_threshold INTEGER DEFAULT 80,
    ADD COLUMN IF NOT EXISTS storage_limit_status VARCHAR(20) DEFAULT 'OK',
    ADD COLUMN IF NOT EXISTS storage_limit_notified BOOLEAN DEFAULT FALSE;

-- Table to record storage limit alerts
CREATE TABLE IF NOT EXISTS storage_limit_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    alert_level VARCHAR(20) NOT NULL,
    usage_percent INTEGER NOT NULL,
    storage_used BIGINT NOT NULL,
    limit_bytes BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_alerts_org ON storage_limit_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_storage_alerts_created ON storage_limit_alerts(created_at DESC);

