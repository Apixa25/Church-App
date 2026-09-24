import type { ChatGroup, ChatMessage } from '../services/chatApi';

/**
 * Replace an existing message (matched by server id, or by tempId for optimistic sends) or append.
 * `tempId` is only compared when the incoming message actually has one, so `null === null` never
 * collapses unrelated messages (the bug that used to overwrite the whole list on edits/deletes).
 */
export const upsertMessage = (list: ChatMessage[], incoming: ChatMessage): ChatMessage[] => {
  const index = list.findIndex(m =>
    (incoming.id && m.id === incoming.id) ||
    (incoming.tempId && m.tempId === incoming.tempId)
  );
  if (index === -1) {
    return [...list, incoming];
  }
  const next = list.slice();
  next[index] = { ...incoming, status: incoming.status ?? 'sent' };
  return next;
};

/** For DMs prefer the other participant returned by the server; fall back to name parsing. */
export const getDirectMessageDisplay = (
  group: ChatGroup | null,
  currentUserName?: string
): { name: string; avatarUrl?: string } => {
  if (!group) return { name: '' };
  if (group.type !== 'DIRECT_MESSAGE') {
    return { name: group.name, avatarUrl: group.imageUrl };
  }
  const other = group.recentMembers?.[0];
  if (other) {
    return {
      name: other.displayName || other.userName,
      avatarUrl: other.profilePicUrl || group.otherUserProfilePic
    };
  }
  const names = group.name.split(' & ').map(n => n.trim());
  const otherNames = currentUserName ? names.filter(n => n !== currentUserName) : names;
  return {
    name: otherNames.length > 0 ? otherNames.join(' & ') : group.name,
    avatarUrl: group.otherUserProfilePic
  };
};
