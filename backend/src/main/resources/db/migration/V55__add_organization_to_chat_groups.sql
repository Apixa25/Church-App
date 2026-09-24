-- Chat groups become organization-scoped, matching posts, prayers and events.
-- Direct messages stay unscoped (organization_id IS NULL) because a DM belongs to two people,
-- not to a church. Existing non-DM groups are backfilled from the creator's church primary
-- organization, falling back to the Global Organization so nothing is orphaned.

ALTER TABLE chat_groups ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE chat_groups
    ADD CONSTRAINT fk_chat_groups_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_group_organization ON chat_groups(organization_id);

UPDATE chat_groups cg
SET organization_id = u.church_primary_organization_id
FROM users u
WHERE cg.created_by = u.id
  AND cg.type <> 'DIRECT_MESSAGE'
  AND cg.organization_id IS NULL
  AND u.church_primary_organization_id IS NOT NULL;

UPDATE chat_groups
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE type <> 'DIRECT_MESSAGE'
  AND organization_id IS NULL
  AND EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001');

-- Hot path for loading a room's history and computing unread counts.
CREATE INDEX IF NOT EXISTS idx_messages_group_timestamp ON messages(chat_group_id, timestamp DESC);

COMMENT ON COLUMN chat_groups.organization_id IS 'Owning organization for group chats. NULL for DIRECT_MESSAGE groups.';
