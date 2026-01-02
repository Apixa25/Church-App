import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

// Organization types that can be Church Primary
const CHURCH_SLOT_TYPES = ['CHURCH', 'MINISTRY', 'NONPROFIT', 'GENERAL'];
// Organization types that can be Family Primary
const FAMILY_SLOT_TYPES = ['FAMILY'];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'FAMILY' | 'GENERAL' | 'GLOBAL';
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
  organizationType?: 'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'FAMILY' | 'GENERAL' | 'GLOBAL';
  organizationLogoUrl?: string;
  role: 'MEMBER' | 'ORG_ADMIN' | 'MODERATOR';
  isPrimary: boolean;
  slotType?: 'CHURCH' | 'FAMILY' | 'GROUP';
  joinedAt: string;
  createdAt: string;
}

interface OrganizationContextType {
  // ========================================================================
  // DUAL PRIMARY SYSTEM - New Structure
  // ========================================================================
  
  // Church Primary: CHURCH, MINISTRY, NONPROFIT, GENERAL types
  churchPrimary: Membership | null;
  
  // Family Primary: FAMILY type only
  familyPrimary: Membership | null;
  
  // Groups: All other memberships (social feed only access)
  groups: Membership[];
  
  // All memberships combined
  allMemberships: Membership[];

  // ========================================================================
  // BACKWARD COMPATIBILITY - Legacy fields (deprecated)
  // ========================================================================
  
  /** @deprecated Use churchPrimary instead */
  primaryMembership: Membership | null;
  
  /** @deprecated Use groups instead */
  secondaryMemberships: Membership[];

  // Loading states
  loading: boolean;

  // ========================================================================
  // DUAL PRIMARY ACTIONS - New Methods
  // ========================================================================
  
  // Set organization as Church Primary
  setChurchPrimary: (orgId: string) => Promise<Membership>;
  
  // Set organization as Family Primary
  setFamilyPrimary: (orgId: string) => Promise<Membership>;
  
  // Join as Group (social feed only)
  joinAsGroup: (orgId: string) => Promise<Membership>;
  
  // Clear primaries
  clearChurchPrimary: () => Promise<void>;
  clearFamilyPrimary: () => Promise<void>;

  // ========================================================================
  // LEGACY ACTIONS (kept for backward compatibility)
  // ========================================================================
  
  joinOrganization: (orgId: string, isPrimary: boolean) => Promise<Membership>;
  leaveOrganization: (orgId: string) => Promise<void>;
  
  /** @deprecated Use setChurchPrimary instead - no more cooldown! */
  switchPrimaryOrganization: (orgId: string) => Promise<Membership>;

  // ========================================================================
  // UTILITIES
  // ========================================================================
  
  /** @deprecated No more cooldown - always returns true */
  canSwitchPrimary: () => Promise<boolean>;
  
  /** @deprecated No more cooldown - always returns 0 */
  getDaysUntilCanSwitch: () => Promise<number>;
  
  refreshMemberships: () => Promise<void>;

  // ========================================================================
  // ORGANIZATION QUERIES
  // ========================================================================

  getAllOrganizations: (page?: number, size?: number) => Promise<{ content: Organization[], totalElements: number }>;
  searchOrganizations: (query: string, page?: number, size?: number) => Promise<{ content: Organization[], totalElements: number }>;
  getOrganizationById: (orgId: string) => Promise<Organization>;
  getOrganizationBySlug: (slug: string) => Promise<Organization>;
  
  // ========================================================================
  // HELPER METHODS
  // ========================================================================
  
  // Check if org type can be Church Primary
  canBeChurchPrimary: (orgType: string) => boolean;
  
  // Check if org type can be Family Primary
  canBeFamilyPrimary: (orgType: string) => boolean;
  
  // Check if user has any primary (church OR family)
  hasAnyPrimary: boolean;
  
  // Check if user has church primary
  hasChurchPrimary: boolean;
  
  // Check if user has family primary
  hasFamilyPrimary: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  
  // Dual Primary System state
  const [churchPrimary, setChurchPrimaryState] = useState<Membership | null>(null);
  const [familyPrimary, setFamilyPrimaryState] = useState<Membership | null>(null);
  const [groups, setGroups] = useState<Membership[]>([]);
  const [allMemberships, setAllMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  // Axios instance with auth
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Fetch user's memberships - Updated for dual primary system
  const fetchMemberships = async () => {
    if (!isAuthenticated) {
      setChurchPrimaryState(null);
      setFamilyPrimaryState(null);
      setGroups([]);
      setAllMemberships([]);
      return;
    }

    try {
      setLoading(true);

      // Fetch all membership types in parallel
      const [churchPrimaryRes, familyPrimaryRes, groupsRes, allRes] = await Promise.all([
        api.get('/organizations/my-memberships/church-primary').catch(() => ({ data: null })),
        api.get('/organizations/my-memberships/family-primary').catch(() => ({ data: null })),
        api.get('/organizations/my-memberships/groups').catch(() => ({ data: [] })),
        api.get('/organizations/my-memberships'),
      ]);

      setChurchPrimaryState(churchPrimaryRes.data || null);
      setFamilyPrimaryState(familyPrimaryRes.data || null);
      setGroups(groupsRes.data || []);
      setAllMemberships(allRes.data || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setChurchPrimaryState(null);
      setFamilyPrimaryState(null);
      setGroups([]);
      setAllMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshMemberships = fetchMemberships;

  // ========================================================================
  // DUAL PRIMARY ACTIONS
  // ========================================================================

  // Set Church Primary
  const setChurchPrimary = async (orgId: string): Promise<Membership> => {
    try {
      const response = await api.post(`/organizations/${orgId}/set-church-primary`);
      await refreshMemberships();
      return response.data;
    } catch (error: any) {
      console.error('Error setting Church Primary:', error);
      throw new Error(error.response?.data?.message || 'Failed to set Church Primary');
    }
  };

  // Set Family Primary
  const setFamilyPrimary = async (orgId: string): Promise<Membership> => {
    try {
      const response = await api.post(`/organizations/${orgId}/set-family-primary`);
      await refreshMemberships();
      return response.data;
    } catch (error: any) {
      console.error('Error setting Family Primary:', error);
      throw new Error(error.response?.data?.message || 'Failed to set Family Primary');
    }
  };

  // Join as Group (social feed only)
  const joinAsGroup = async (orgId: string): Promise<Membership> => {
    try {
      const response = await api.post(`/organizations/${orgId}/join-as-group`);
      await refreshMemberships();
      return response.data;
    } catch (error: any) {
      console.error('Error joining as Group:', error);
      throw new Error(error.response?.data?.message || 'Failed to join as Group');
    }
  };

  // Clear Church Primary
  const clearChurchPrimary = async (): Promise<void> => {
    try {
      await api.delete('/organizations/my-church-primary');
      await refreshMemberships();
    } catch (error: any) {
      console.error('Error clearing Church Primary:', error);
      throw new Error(error.response?.data?.message || 'Failed to clear Church Primary');
    }
  };

  // Clear Family Primary
  const clearFamilyPrimary = async (): Promise<void> => {
    try {
      await api.delete('/organizations/my-family-primary');
      await refreshMemberships();
    } catch (error: any) {
      console.error('Error clearing Family Primary:', error);
      throw new Error(error.response?.data?.message || 'Failed to clear Family Primary');
    }
  };

  // ========================================================================
  // LEGACY ACTIONS (backward compatibility)
  // ========================================================================

  // Join organization (legacy)
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

  // Switch primary organization (legacy - now maps to setChurchPrimary)
  const switchPrimaryOrganization = async (orgId: string): Promise<Membership> => {
    return setChurchPrimary(orgId);
  };

  // Can switch primary (legacy - always true now, no cooldown!)
  const canSwitchPrimary = async (): Promise<boolean> => {
    return true; // No more cooldown!
  };

  // Get days until can switch (legacy - always 0 now, no cooldown!)
  const getDaysUntilCanSwitch = async (): Promise<number> => {
    return 0; // No more cooldown!
  };

  // ========================================================================
  // ORGANIZATION QUERIES
  // ========================================================================

  const getAllOrganizations = async (
    page: number = 0,
    size: number = 20
  ): Promise<{ content: Organization[], totalElements: number }> => {
    try {
      const response = await api.get('/organizations', {
        params: { page, size },
      });
      return {
        content: response.data.content,
        totalElements: response.data.totalElements,
      };
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return { content: [], totalElements: 0 };
    }
  };

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

  const getOrganizationById = async (orgId: string): Promise<Organization> => {
    try {
      const response = await api.get(`/organizations/${orgId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch organization');
    }
  };

  const getOrganizationBySlug = async (slug: string): Promise<Organization> => {
    try {
      const response = await api.get(`/organizations/slug/${slug}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch organization');
    }
  };

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  const canBeChurchPrimary = (orgType: string): boolean => {
    return CHURCH_SLOT_TYPES.includes(orgType);
  };

  const canBeFamilyPrimary = (orgType: string): boolean => {
    return FAMILY_SLOT_TYPES.includes(orgType);
  };

  // Computed properties
  const hasChurchPrimary = churchPrimary !== null;
  const hasFamilyPrimary = familyPrimary !== null;
  const hasAnyPrimary = hasChurchPrimary || hasFamilyPrimary;

  // Initialize memberships on mount and when auth changes
  useEffect(() => {
    fetchMemberships();
  }, [isAuthenticated, token]);

  const value: OrganizationContextType = {
    // Dual Primary System
    churchPrimary,
    familyPrimary,
    groups,
    allMemberships,
    
    // Backward compatibility (deprecated)
    primaryMembership: churchPrimary, // Maps to churchPrimary
    secondaryMemberships: groups,     // Maps to groups
    
    // Loading
    loading,
    
    // Dual Primary Actions
    setChurchPrimary,
    setFamilyPrimary,
    joinAsGroup,
    clearChurchPrimary,
    clearFamilyPrimary,
    
    // Legacy Actions
    joinOrganization,
    leaveOrganization,
    switchPrimaryOrganization,
    canSwitchPrimary,
    getDaysUntilCanSwitch,
    refreshMemberships,
    
    // Organization Queries
    getAllOrganizations,
    searchOrganizations,
    getOrganizationById,
    getOrganizationBySlug,
    
    // Helpers
    canBeChurchPrimary,
    canBeFamilyPrimary,
    hasAnyPrimary,
    hasChurchPrimary,
    hasFamilyPrimary,
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
