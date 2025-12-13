import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

export interface Group {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'ORG_PRIVATE' | 'CROSS_ORG' | 'INVITE_ONLY';
  organizationId?: string;
  organizationName?: string;
  creatorId: string;
  creatorName?: string;
  creatorAvatarUrl?: string;
  tags?: string[];
  maxMembers?: number;
  memberCount?: number;
  settings?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  // User-specific fields (if member)
  userRole?: 'CREATOR' | 'MEMBER' | 'ADMIN' | 'MODERATOR';
  isMuted?: boolean;
  joinedAt?: string;
}

export interface GroupMembership {
  id: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  groupId: string;
  groupName?: string;
  role: 'CREATOR' | 'MEMBER' | 'ADMIN' | 'MODERATOR';
  isMuted: boolean;
  joinedAt: string;
  createdAt: string;
}

interface GroupContextType {
  // Current user's group memberships
  myGroups: GroupMembership[];
  unmutedGroups: GroupMembership[];
  mutedGroups: GroupMembership[];

  // Loading states
  loading: boolean;

  // Actions
  joinGroup: (groupId: string) => Promise<GroupMembership>;
  leaveGroup: (groupId: string) => Promise<void>;
  muteGroup: (groupId: string) => Promise<void>;
  unmuteGroup: (groupId: string) => Promise<void>;
  createGroup: (groupData: Partial<Group>) => Promise<Group>;
  updateGroup: (groupId: string, groupData: Partial<Group>) => Promise<Group>;
  deleteGroup: (groupId: string) => Promise<void>;

  // Utilities
  refreshGroups: () => Promise<void>;
  isMember: (groupId: string) => Promise<boolean>;
  isCreator: (groupId: string) => Promise<boolean>;
  canJoin: (groupId: string) => Promise<boolean>;

  // Group queries
  searchGroups: (query: string, page?: number, size?: number) => Promise<{ content: Group[], totalElements: number }>;
  findGroupsByTags: (tags: string[], page?: number, size?: number) => Promise<{ content: Group[], totalElements: number }>;
  getGroupById: (groupId: string) => Promise<Group>;
  getMemberCount: (groupId: string) => Promise<number>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

interface GroupProviderProps {
  children: ReactNode;
}

export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [myGroups, setMyGroups] = useState<GroupMembership[]>([]);
  const [unmutedGroups, setUnmutedGroups] = useState<GroupMembership[]>([]);
  const [mutedGroups, setMutedGroups] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);

  // Axios instance with auth
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Fetch user's group memberships
  const fetchGroups = async () => {
    if (!isAuthenticated) {
      setMyGroups([]);
      setUnmutedGroups([]);
      setMutedGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all group memberships in parallel
      const [allRes, unmutedRes, mutedRes] = await Promise.all([
        api.get('/groups/my-groups'),
        api.get('/groups/my-groups/unmuted'),
        api.get('/groups/my-groups/muted'),
      ]);

      setMyGroups(allRes.data || []);
      setUnmutedGroups(unmutedRes.data || []);
      setMutedGroups(mutedRes.data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setMyGroups([]);
      setUnmutedGroups([]);
      setMutedGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshGroups = fetchGroups;

  // Create group
  const createGroup = async (groupData: Partial<Group>): Promise<Group> => {
    try {
      const response = await api.post('/groups', groupData);
      await refreshGroups();
      return response.data;
    } catch (error: any) {
      console.error('Error creating group:', error);
      throw new Error(error.response?.data?.message || 'Failed to create group');
    }
  };

  // Update group
  const updateGroup = async (groupId: string, groupData: Partial<Group>): Promise<Group> => {
    try {
      const response = await api.put(`/groups/${groupId}`, groupData);
      await refreshGroups();
      return response.data;
    } catch (error: any) {
      console.error('Error updating group:', error);
      throw new Error(error.response?.data?.message || 'Failed to update group');
    }
  };

  // Delete group
  const deleteGroup = async (groupId: string): Promise<void> => {
    try {
      await api.delete(`/groups/${groupId}`);
      await refreshGroups();
    } catch (error: any) {
      console.error('Error deleting group:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete group');
    }
  };

  // Join group
  const joinGroup = async (groupId: string): Promise<GroupMembership> => {
    try {
      const response = await api.post(`/groups/${groupId}/join`);
      await refreshGroups();
      return response.data;
    } catch (error: any) {
      console.error('Error joining group:', error);
      throw new Error(error.response?.data?.message || 'Failed to join group');
    }
  };

  // Leave group
  const leaveGroup = async (groupId: string): Promise<void> => {
    try {
      await api.delete(`/groups/${groupId}/leave`);
      await refreshGroups();
    } catch (error: any) {
      console.error('Error leaving group:', error);
      throw new Error(error.response?.data?.message || 'Failed to leave group');
    }
  };

  // Mute group
  const muteGroup = async (groupId: string): Promise<void> => {
    try {
      await api.post(`/groups/${groupId}/mute`);
      await refreshGroups();
    } catch (error: any) {
      console.error('Error muting group:', error);
      throw new Error(error.response?.data?.message || 'Failed to mute group');
    }
  };

  // Unmute group
  const unmuteGroup = async (groupId: string): Promise<void> => {
    try {
      await api.post(`/groups/${groupId}/unmute`);
      await refreshGroups();
    } catch (error: any) {
      console.error('Error unmuting group:', error);
      throw new Error(error.response?.data?.message || 'Failed to unmute group');
    }
  };

  // Check if user is member
  const isMember = async (groupId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/groups/${groupId}/is-member`);
      return response.data;
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  };

  // Check if user is creator
  const isCreator = async (groupId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/groups/${groupId}/is-creator`);
      return response.data;
    } catch (error) {
      console.error('Error checking creator status:', error);
      return false;
    }
  };

  // Check if user can join
  const canJoin = async (groupId: string): Promise<boolean> => {
    try {
      const response = await api.get(`/groups/${groupId}/can-join`);
      return response.data;
    } catch (error) {
      console.error('Error checking join eligibility:', error);
      return false;
    }
  };

  // Search groups
  const searchGroups = async (
    query: string,
    page: number = 0,
    size: number = 20
  ): Promise<{ content: Group[], totalElements: number }> => {
    try {
      const response = await api.get('/groups/search', {
        params: { query, page, size },
      });
      return {
        content: response.data.content,
        totalElements: response.data.totalElements,
      };
    } catch (error) {
      console.error('Error searching groups:', error);
      return { content: [], totalElements: 0 };
    }
  };

  // Find groups by tags
  const findGroupsByTags = async (
    tags: string[],
    page: number = 0,
    size: number = 20
  ): Promise<{ content: Group[], totalElements: number }> => {
    try {
      const response = await api.get('/groups/by-tags', {
        params: { tags, page, size },
      });
      return {
        content: response.data.content,
        totalElements: response.data.totalElements,
      };
    } catch (error) {
      console.error('Error finding groups by tags:', error);
      return { content: [], totalElements: 0 };
    }
  };

  // Get group by ID
  const getGroupById = async (groupId: string): Promise<Group> => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching group:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch group');
    }
  };

  // Get member count
  const getMemberCount = async (groupId: string): Promise<number> => {
    try {
      const response = await api.get(`/groups/${groupId}/member-count`);
      return response.data;
    } catch (error) {
      console.error('Error fetching member count:', error);
      return 0;
    }
  };

  // Initialize groups on mount and when auth changes
  useEffect(() => {
    fetchGroups();
  }, [isAuthenticated, token]);

  const value: GroupContextType = {
    myGroups,
    unmutedGroups,
    mutedGroups,
    loading,
    joinGroup,
    leaveGroup,
    muteGroup,
    unmuteGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    refreshGroups,
    isMember,
    isCreator,
    canJoin,
    searchGroups,
    findGroupsByTags,
    getGroupById,
    getMemberCount,
  };

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
};

// Custom hook to use GroupContext
export const useGroup = (): GroupContextType => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};
