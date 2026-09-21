-- Organization Invite Links (shareable links / QR codes for FAMILY-type organizations)
-- Mirrors group_invite_links (V44) so family groups can be joined by invitation instead of
-- being discovered in the public browse list.
CREATE TABLE organization_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    use_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP
);

CREATE INDEX idx_org_invite_link_org ON organization_invite_links(organization_id);
CREATE INDEX idx_org_invite_link_code ON organization_invite_links(invite_code);
CREATE INDEX idx_org_invite_link_creator ON organization_invite_links(created_by_user_id);

COMMENT ON TABLE organization_invite_links IS 'Shareable invite links for organizations (currently FAMILY type only). Links stay valid until deactivated.';
