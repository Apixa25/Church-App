import api from './api';

export interface OrganizationGroup {
  id: string;
  organization: {
    id: string;
    name: string;
    type: string;
    logoUrl?: string;
  };
  isMuted: boolean;
  joinedAt: string;
}

const organizationGroupApi = {
  followOrganizationAsGroup: async (organizationId: string): Promise<void> => {
    await api.post(`/organizations/${organizationId}/follow-as-group`);
  },

  unfollowOrganizationAsGroup: async (organizationId: string): Promise<void> => {
    await api.delete(`/organizations/${organizationId}/follow-as-group`);
  },

  getFollowedOrganizations: async (): Promise<OrganizationGroup[]> => {
    const response = await api.get('/organizations/followed-as-groups');
    return response.data;
  },

  canFollowAsGroup: async (organizationId: string): Promise<boolean> => {
    const response = await api.get(`/organizations/${organizationId}/can-follow-as-group`);
    return response.data;
  },

  isFollowingAsGroup: async (organizationId: string): Promise<boolean> => {
    const response = await api.get(`/organizations/${organizationId}/is-following-as-group`);
    return response.data;
  },

  muteOrganizationAsGroup: async (organizationId: string): Promise<void> => {
    await api.post(`/organizations/${organizationId}/mute-as-group`);
  },

  unmuteOrganizationAsGroup: async (organizationId: string): Promise<void> => {
    await api.post(`/organizations/${organizationId}/unmute-as-group`);
  },
};

export default organizationGroupApi;

