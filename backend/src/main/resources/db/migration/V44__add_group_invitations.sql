-- Group Invitations (Direct User Invites)
CREATE TABLE group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    message VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT uk_group_invitation_unique UNIQUE (group_id, invited_user_id)
);

CREATE INDEX idx_group_invitation_group ON group_invitations(group_id);
CREATE INDEX idx_group_invitation_inviter ON group_invitations(inviter_user_id);
CREATE INDEX idx_group_invitation_invited ON group_invitations(invited_user_id);
CREATE INDEX idx_group_invitation_status ON group_invitations(status);

-- Group Invite Links (Shareable Links)
CREATE TABLE group_invite_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code VARCHAR(32) NOT NULL UNIQUE,
    use_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deactivated_at TIMESTAMP
);

CREATE INDEX idx_group_invite_link_group ON group_invite_links(group_id);
CREATE INDEX idx_group_invite_link_code ON group_invite_links(invite_code);
CREATE INDEX idx_group_invite_link_creator ON group_invite_links(created_by_user_id);
