import api from './api';

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupImageUrl?: string;
  groupDescription?: string;
  inviterId: string;
  inviterName: string;
  inviterAvatarUrl?: string;
  invitedUserId: string;
  invitedUserName: string;
  invitedUserAvatarUrl?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface GroupInviteLink {
  id: string;
  groupId: string;
  groupName: string;
  groupImageUrl?: string;
  groupDescription?: string;
  inviteCode: string;
  inviteUrl: string;
  useCount: number;
  isActive: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface GroupMembership {
  id: string;
  userId: string;
  groupId: string;
  groupName?: string;
  groupImageUrl?: string;
  role: string;
  isMuted: boolean;
  joinedAt: string;
}

const groupInviteApi = {
  // ========================================================================
  // DIRECT USER INVITATIONS
  // ========================================================================

  /**
   * Create a direct invitation for a user to join a group
   */
  createInvitation: async (
    groupId: string,
    invitedUserId: string,
    message?: string
  ): Promise<GroupInvitation> => {
    const response = await api.post(`/groups/${groupId}/invitations`, {
      invitedUserId,
      message,
    });
    return response.data;
  },

  /**
   * Get all pending invitations for the current user
   */
  getPendingInvitations: async (): Promise<GroupInvitation[]> => {
    const response = await api.get('/groups/invitations/pending');
    return response.data;
  },

  /**
   * Get count of pending invitations for badge display
   */
  getPendingInvitationCount: async (): Promise<number> => {
    const response = await api.get('/groups/invitations/pending/count');
    return response.data;
  },

  /**
   * Accept a pending invitation
   */
  acceptInvitation: async (invitationId: string): Promise<GroupInvitation> => {
    const response = await api.post(`/groups/invitations/${invitationId}/accept`);
    return response.data;
  },

  /**
   * Decline a pending invitation
   */
  declineInvitation: async (invitationId: string): Promise<GroupInvitation> => {
    const response = await api.post(`/groups/invitations/${invitationId}/decline`);
    return response.data;
  },

  // ========================================================================
  // SHAREABLE INVITE LINKS
  // ========================================================================

  /**
   * Create a shareable invite link for a group
   */
  createInviteLink: async (groupId: string): Promise<GroupInviteLink> => {
    const response = await api.post(`/groups/${groupId}/invite-links`);
    return response.data;
  },

  /**
   * Get all active invite links for a group
   */
  getGroupInviteLinks: async (groupId: string): Promise<GroupInviteLink[]> => {
    const response = await api.get(`/groups/${groupId}/invite-links`);
    return response.data;
  },

  /**
   * Get invite link info by code (for previewing before joining)
   */
  getInviteLinkInfo: async (inviteCode: string): Promise<GroupInviteLink> => {
    const response = await api.get(`/groups/invite/${inviteCode}`);
    return response.data;
  },

  /**
   * Join a group via invite link
   */
  joinViaInviteLink: async (inviteCode: string): Promise<GroupMembership> => {
    const response = await api.post(`/groups/invite/${inviteCode}/join`);
    return response.data;
  },

  /**
   * Deactivate an invite link
   */
  deactivateInviteLink: async (linkId: string): Promise<void> => {
    await api.delete(`/groups/invite-links/${linkId}`);
  },
};

export default groupInviteApi;
