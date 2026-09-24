import { upsertMessage, getDirectMessageDisplay } from './chatMessages';
import type { ChatGroup, ChatMessage, GroupMember } from '../services/chatApi';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: 'id-1',
  chatGroupId: 'g1',
  chatGroupName: 'Group',
  userId: 'u1',
  userName: 'Alice',
  userDisplayName: 'Alice',
  content: 'hello',
  messageType: 'TEXT',
  messageTypeDisplay: 'Text Message',
  timestamp: '2026-09-23T12:00:00',
  isEdited: false,
  isDeleted: false,
  replyCount: 0,
  canEdit: false,
  canDelete: false,
  ...overrides
});

describe('upsertMessage', () => {
  it('appends messages it has not seen before', () => {
    const list = [message({ id: 'a' })];
    const result = upsertMessage(list, message({ id: 'b' }));
    expect(result.map(m => m.id)).toEqual(['a', 'b']);
  });

  it('replaces a message with the same server id (edits/deletes)', () => {
    const list = [message({ id: 'a', content: 'old' }), message({ id: 'b' })];
    const result = upsertMessage(list, message({ id: 'a', content: 'new', isEdited: true }));
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('new');
    expect(result[1].id).toBe('b');
  });

  it('does not treat two messages without tempIds as duplicates (null === null bug)', () => {
    // Server payloads carry tempId: null for everyone except the original sender.
    const list = [
      message({ id: 'a', tempId: undefined }),
      message({ id: 'b', tempId: undefined })
    ];
    const result = upsertMessage(list, message({ id: 'c', tempId: null as unknown as undefined }));
    expect(result.map(m => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('reconciles an optimistic message with the server copy via tempId and marks it sent', () => {
    const list = [message({ id: 'temp-1', tempId: 'temp-1', status: 'sending' })];
    const result = upsertMessage(list, message({ id: 'server-1', tempId: 'temp-1' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('server-1');
    expect(result[0].status).toBe('sent');
  });

  it('does not mutate the original list', () => {
    const list = [message({ id: 'a' })];
    const copy = [...list];
    upsertMessage(list, message({ id: 'a', content: 'changed' }));
    expect(list).toEqual(copy);
  });
});

describe('getDirectMessageDisplay', () => {
  const member = (overrides: Partial<GroupMember>): GroupMember => ({
    id: 'm1',
    userId: 'u2',
    userName: 'Bob',
    displayName: 'Bob Jones',
    email: 'bob@example.com',
    memberRole: 'MEMBER',
    roleDisplayName: 'Member',
    isActive: true,
    isMuted: false,
    notificationsEnabled: true,
    joinedAt: '2026-01-01T00:00:00',
    isOnline: false,
    canPost: true,
    canModerate: false,
    canManageMembers: false,
    ...overrides
  });

  const group = (overrides: Partial<ChatGroup>): ChatGroup => ({
    id: 'g1',
    name: 'Alice & Bob Jones',
    type: 'DIRECT_MESSAGE',
    createdBy: 'u1',
    createdByName: 'Alice',
    isPrivate: true,
    isActive: true,
    memberCount: 2,
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    isMember: true,
    canPost: true,
    canModerate: false,
    unreadCount: 0,
    ...overrides
  });

  it('prefers the other participant returned by the server', () => {
    const display = getDirectMessageDisplay(
      group({ recentMembers: [member({ profilePicUrl: 'https://cdn/bob.png' })] }),
      'Alice'
    );
    expect(display).toEqual({ name: 'Bob Jones', avatarUrl: 'https://cdn/bob.png' });
  });

  it('falls back to stripping the current user from "A & B" names', () => {
    const display = getDirectMessageDisplay(group({ otherUserProfilePic: 'pic' }), 'Alice');
    expect(display.name).toBe('Bob Jones');
    expect(display.avatarUrl).toBe('pic');
  });

  it('returns the group name and image for non-DM groups', () => {
    const display = getDirectMessageDisplay(group({ type: 'PRAYER', name: 'Prayer Warriors', imageUrl: 'img' }), 'Alice');
    expect(display).toEqual({ name: 'Prayer Warriors', avatarUrl: 'img' });
  });

  it('handles a missing group', () => {
    expect(getDirectMessageDisplay(null, 'Alice')).toEqual({ name: '' });
  });
});
