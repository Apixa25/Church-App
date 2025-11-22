import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'GLOBAL';
  tier: 'BASIC' | 'PREMIUM';
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  stripeConnectAccountId?: string;
  subscriptionExpiresAt?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
  logoUrl?: string;
  memberCount?: number;
  primaryMemberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Membership {
  id: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  organizationId: string;
  organizationName?: string;
  organizationType?: 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'GLOBAL';
  organizationLogoUrl?: string;
  role: 'MEMBER' | 'ORG_ADMIN' | 'MODERATOR';
  isPrimary: boolean;
  joinedAt: string;
  createdAt: string;
}

interface OrganizationContextType {
  // Current user's memberships
  primaryMembership: Membership | null;
  secondaryMemberships: Membership[];
  allMemberships: Membership[];

  // Loading states
  loading: boolean;

  // Actions
  joinOrganization: (orgId: string, isPrimary: boolean) => Promise<Membership>;
  leaveOrganization: (orgId: string) => Promise<void>;
  switchPrimaryOrganization: (orgId: string) => Promise<Membership>;

  // Utilities
  canSwitchPrimary: () => Promise<boolean>;
  getDaysUntilCanSwitch: () => Promise<number>;
  refreshMemberships: () => Promise<void>;

  // Organization queries
  searchOrganizations: (query: string, page?: number, size?: number) => Promise<{ content: Organization[], totalElements: number }>;
  getOrganizationById: (orgId: string) => Promise<Organization>;
  getOrganizationBySlug: (slug: string) => Promise<Organization>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [primaryMembership, setPrimaryMembership] = useState<Membership | null>(null);
  const [secondaryMemberships, setSecondaryMemberships] = useState<Membership[]>([]);
  const [allMemberships, setAllMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  // Axios instance with auth
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Fetch user's memberships
  const fetchMemberships = async () => {
    console.log('🔥 OrganizationContext v2.0 - BUILD 2025-11-22 23:35 PST - fetchMemberships called');
    console.log('🔥 isAuthenticated:', isAuthenticated, 'token:', token ? 'Present' : 'Missing');
    
    if (!isAuthenticated) {
      console.log('🔥 Not authenticated, clearing memberships');
      setPrimaryMembership(null);
      setSecondaryMemberships([]);
      setAllMemberships([]);
      // Keep loading = true because we're waiting for authentication
      // Don't set loading = false here, or AdminRoute will check too early
      return;
    }

    try {
      setLoading(true);
      console.log('🔥 Fetching memberships from API...');

      // Fetch all memberships in parallel
      const [primaryRes, secondaryRes, allRes] = await Promise.all([
        api.get('/organizations/my-memberships/primary'),
        api.get('/organizations/my-memberships/secondary'),
        api.get('/organizations/my-memberships'),
      ]);

      console.log('🔥 API Response - allMemberships:', allRes.data);
      console.log('🔥 Org Admin count:', allRes.data?.filter((m: any) => m.role === 'ORG_ADMIN').length || 0);

      setPrimaryMembership(primaryRes.data || null);
      setSecondaryMemberships(secondaryRes.data || []);
      setAllMemberships(allRes.data || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setPrimaryMembership(null);
      setSecondaryMemberships([]);
      setAllMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshMemberships = fetchMemberships;

  // Join organization
  const joinOrganization = async (orgId: string, isPrimary: boolean = false): Promise<Membership> => {
    try {
      const response = await api.post(`/organizations/${orgId}/join`, null, {
        params: { isPrimary },
      });

      await refreshMemberships();
      return response.data;
    } catch (error: any) {
      console.error('Error joining organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to join organization');
    }
  };

  // Leave organization
  const leaveOrganization = async (orgId: string): Promise<void> => {
    try {
      await api.delete(`/organizations/${orgId}/leave`);
      await refreshMemberships();
    } catch (error: any) {
      console.error('Error leaving organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to leave organization');
    }
  };

  // Switch primary organization
  const switchPrimaryOrganization = async (orgId: string): Promise<Membership> => {
    try {
      const response = await api.post(`/organizations/${orgId}/switch-primary`);
      await refreshMemberships();
      return response.data;
    } catch (error: any) {
      console.error('Error switching primary organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to switch primary organization. You may need to wait 30 days between switches.');
    }
  };

  // Check if can switch primary
  const canSwitchPrimary = async (): Promise<boolean> => {
    try {
      const response = await api.get('/organizations/switch-primary/can-switch');
      return response.data;
    } catch (error) {
      console.error('Error checking switch eligibility:', error);
      return false;
    }
  };

  // Get days until can switch
  const getDaysUntilCanSwitch = async (): Promise<number> => {
    try {
      const response = await api.get('/organizations/switch-primary/days-until');
      return response.data;
    } catch (error) {
      console.error('Error getting days until switch:', error);
      return 30; // Default to max cooldown
    }
  };

  // Search organizations
  const searchOrganizations = async (
    query: string,
    page: number = 0,
    size: number = 20
  ): Promise<{ content: Organization[], totalElements: number }> => {
    try {
      const response = await api.get('/organizations/search', {
        params: { query, page, size },
      });
      return {
        content: response.data.content,
        totalElements: response.data.totalElements,
      };
    } catch (error) {
      console.error('Error searching organizations:', error);
      return { content: [], totalElements: 0 };
    }
  };

  // Get organization by ID
  const getOrganizationById = async (orgId: string): Promise<Organization> => {
    try {
      const response = await api.get(`/organizations/${orgId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch organization');
    }
  };

  // Get organization by slug
  const getOrganizationBySlug = async (slug: string): Promise<Organization> => {
    try {
      const response = await api.get(`/organizations/slug/${slug}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch organization');
    }
  };

  // Initialize memberships on mount and when auth changes
  useEffect(() => {
    fetchMemberships();
  }, [isAuthenticated, token]);

  const value: OrganizationContextType = {
    primaryMembership,
    secondaryMemberships,
    allMemberships,
    loading,
    joinOrganization,
    leaveOrganization,
    switchPrimaryOrganization,
    canSwitchPrimary,
    getDaysUntilCanSwitch,
    refreshMemberships,
    searchOrganizations,
    getOrganizationById,
    getOrganizationBySlug,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

// Custom hook to use OrganizationContext
export const useOrganization = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
