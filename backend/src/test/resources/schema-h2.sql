CREATE DOMAIN IF NOT EXISTS jsonb AS JSON;

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,
    created_by_user_id UUID NOT NULL,
    created_by_org_id UUID,
    tags jsonb,
    allowed_org_ids jsonb,
    settings jsonb,
    member_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_group_memberships (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    group_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uk_user_group UNIQUE (user_id, group_id)
);

