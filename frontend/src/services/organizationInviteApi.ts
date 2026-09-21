import api from './api';

/**
 * Invite links for FAMILY organizations (family groups).
 * Mirrors groupInviteApi but talks to /organizations/... - see
 * OrganizationInvitationController on the backend.
 */

export interface OrganizationInviteLink {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  organizationType: 'FAMILY' | 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'GENERAL' | 'GLOBAL';
  memberCount?: number | null;
  inviteCode: string;
  inviteUrl: string;
  useCount: number;
  isActive: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

/** Web path served by App.tsx for family invites. Keep in sync with the backend DTO. */
export const FAMILY_INVITE_PATH = '/invite/family/';

/**
 * Accepts a full invite URL, a bare code, or anything in between and returns the code
 * (or null). Used by the "paste an invite link" box.
 */
export const extractFamilyInviteCode = (input: string): string | null => {
  const value = (input || '').trim();
  if (!value) return null;

  const pathMatch = value.match(/\/invite\/family\/([A-Za-z0-9]{6,32})/);
  if (pathMatch) return pathMatch[1];

  if (/^[A-Za-z0-9]{6,32}$/.test(value)) return value;

  return null;
};

/**
 * Pulls a human-readable message out of the backend's ErrorResponse shape
 * ({ errorCode, userMessage, developerMessage }) or falls back to axios/message text.
 */
export const inviteErrorMessage = (err: any, fallback: string): string => {
  const data = err?.response?.data;
  return (
    data?.developerMessage ||
    data?.userMessage ||
    data?.message ||
    err?.message ||
    fallback
  );
};

const organizationInviteApi = {
  /** Mint a new link (family ORG_ADMIN only). */
  createInviteLink: async (orgId: string): Promise<OrganizationInviteLink> => {
    const response = await api.post(`/organizations/${orgId}/invite-links`);
    return response.data;
  },

  /** Active links for a family (members can view). */
  getInviteLinks: async (orgId: string): Promise<OrganizationInviteLink[]> => {
    const response = await api.get(`/organizations/${orgId}/invite-links`);
    return response.data;
  },

  /** Newest active link, created on demand (family ORG_ADMIN only). */
  getOrCreateCurrentLink: async (orgId: string): Promise<OrganizationInviteLink> => {
    const response = await api.get(`/organizations/${orgId}/invite-links/current`);
    return response.data;
  },

  /** Public preview - works logged out. */
  getInviteLinkInfo: async (inviteCode: string): Promise<OrganizationInviteLink> => {
    const response = await api.get(`/organizations/invite/${encodeURIComponent(inviteCode)}`);
    return response.data;
  },

  /** Join the family as Family Primary. */
  joinViaInviteLink: async (inviteCode: string): Promise<any> => {
    const response = await api.post(`/organizations/invite/${encodeURIComponent(inviteCode)}/join`);
    return response.data;
  },

  deactivateInviteLink: async (linkId: string): Promise<void> => {
    await api.delete(`/organizations/invite-links/${linkId}`);
  },
};

export default organizationInviteApi;
