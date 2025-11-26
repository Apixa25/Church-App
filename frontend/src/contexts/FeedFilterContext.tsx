import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { useActiveContext } from './ActiveContextContext';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';

export type FeedFilter = 'EVERYTHING' | 'ALL' | 'PRIMARY_ONLY' | 'SELECTED_GROUPS';

export interface FeedPreference {
  id: string;
  userId: string;
  activeFilter: FeedFilter;
  selectedGroupIds: string[];
  updatedAt: string;
}

export interface FeedParameters {
  primaryOrgId: string | null;
  secondaryOrgIds: string[];
  groupIds: string[];
}

interface FeedFilterContextType {
  // Current feed preference
  preference: FeedPreference | null;
  activeFilter: FeedFilter;
  selectedGroupIds: string[];

  // Feed parameters (calculated based on preference)
  feedParameters: FeedParameters | null;

  // Visibility helpers
  visibleGroupIds: string[];
  hasPrimaryOrg: boolean;
  primaryOrgId: string | null;
  secondaryOrgIds: string[];

  // Loading state
  loading: boolean;

  // Actions
  setFilter: (filter: FeedFilter, groupIds?: string[]) => Promise<void>;
  resetFilter: () => Promise<void>;
  refreshPreference: () => Promise<void>;
}

const FeedFilterContext = createContext<FeedFilterContextType | undefined>(undefined);

interface FeedFilterProviderProps {
  children: ReactNode;
}

export const FeedFilterProvider: React.FC<FeedFilterProviderProps> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  // Use the new dual-primary system
  const { churchPrimary, familyPrimary, groups, hasChurchPrimary, hasFamilyPrimary } = useOrganization();
  // Get active context for context-aware filtering
  const { activeContext, activeOrganizationId } = useActiveContext();
  
  const [preference, setPreference] = useState<FeedPreference | null>(null);
  const [feedParameters, setFeedParameters] = useState<FeedParameters | null>(null);
  const [visibleGroupIds, setVisibleGroupIds] = useState<string[]>([]);
  const [primaryOrgId, setPrimaryOrgId] = useState<string | null>(null);
  const [secondaryOrgIds, setSecondaryOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive hasPrimaryOrg - now means user has either Church or Family primary
  const hasPrimaryOrg = hasChurchPrimary || hasFamilyPrimary;
  
  // Legacy compatibility: primaryMembership maps to churchPrimary
  const primaryMembership = churchPrimary;
  // Legacy compatibility: secondaryMemberships maps to groups
  const secondaryMemberships = groups;

  // Axios instance with auth
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Update primaryOrgId and secondaryOrgIds based on active context (DUAL PRIMARY SYSTEM)
  // When PRIMARY_ONLY filter is active, use the active context's organization
  useEffect(() => {
    // Primary org is determined by active context (Church or Family)
    if (activeOrganizationId) {
      setPrimaryOrgId(activeOrganizationId);
    } else if (churchPrimary) {
      // Fallback to church primary if no active context set
      setPrimaryOrgId(churchPrimary.organizationId);
    } else if (familyPrimary) {
      // Fallback to family primary
      setPrimaryOrgId(familyPrimary.organizationId);
    } else {
      setPrimaryOrgId(null);
    }

    // Secondary orgs include the "other" primary (if not active) plus all groups
    const secondaryIds: string[] = [];
    
    // Add the non-active primary as secondary
    if (activeContext === 'church' && familyPrimary) {
      secondaryIds.push(familyPrimary.organizationId);
    } else if (activeContext === 'family' && churchPrimary) {
      secondaryIds.push(churchPrimary.organizationId);
    }
    
    // Add all group memberships
    if (groups && groups.length > 0) {
      secondaryIds.push(...groups.map(m => m.organizationId));
    }
    
    setSecondaryOrgIds(secondaryIds);
  }, [activeContext, activeOrganizationId, churchPrimary, familyPrimary, groups]);

  // Fetch feed preference and parameters
  const fetchPreference = async () => {
    if (!isAuthenticated) {
      // Clear all state for unauthenticated users
      setPreference(null);
      setFeedParameters(null);
      setVisibleGroupIds([]);
      setPrimaryOrgId(null);
      setSecondaryOrgIds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch feed preference data (no longer need has-primary-org, primary-org-id, secondary-org-ids)
      const [
        preferenceRes,
        parametersRes,
        visibleGroupsRes,
      ] = await Promise.allSettled([
        api.get('/feed-preferences'),
        api.get('/feed-preferences/feed-parameters'),
        api.get('/feed-preferences/visible-group-ids'),
      ]);

      // Handle feed preference
      if (preferenceRes.status === 'fulfilled') {
        setPreference(preferenceRes.value.data);
      } else {
        // Default preference if none exists
        setPreference({
          id: '',
          userId: '',
          activeFilter: 'EVERYTHING',
          selectedGroupIds: [],
          updatedAt: new Date().toISOString(),
        });
      }

      // Handle feed parameters
      if (parametersRes.status === 'fulfilled') {
        setFeedParameters(parametersRes.value.data);
      }

      // Handle visible group IDs
      if (visibleGroupsRes.status === 'fulfilled') {
        setVisibleGroupIds(visibleGroupsRes.value.data || []);
      }
    } catch (error) {
      console.error('Error fetching feed preference:', error);
      // Set defaults on error
      setPreference({
        id: '',
        userId: '',
        activeFilter: 'EVERYTHING',
        selectedGroupIds: [],
        updatedAt: new Date().toISOString(),
      });
      setFeedParameters(null);
      setVisibleGroupIds([]);
      setPrimaryOrgId(null);
      setSecondaryOrgIds([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshPreference = fetchPreference;

  // Set filter
  const setFilter = async (filter: FeedFilter, groupIds: string[] = []): Promise<void> => {
    try {
      await api.post('/feed-preferences', {
        activeFilter: filter,
        selectedGroupIds: filter === 'SELECTED_GROUPS' ? groupIds : [],
      });

      await refreshPreference();
    } catch (error: any) {
      console.error('Error setting feed filter:', error);
      throw new Error(error.response?.data?.message || 'Failed to update feed filter');
    }
  };

  // Reset filter to EVERYTHING (default)
  const resetFilter = async (): Promise<void> => {
    try {
      await api.delete('/feed-preferences');
      await refreshPreference();
    } catch (error: any) {
      console.error('Error resetting feed filter:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset feed filter');
    }
  };

  // Initialize preference on mount and when auth changes
  useEffect(() => {
    fetchPreference();
  }, [isAuthenticated, token]);

  const value: FeedFilterContextType = {
    preference,
    activeFilter: preference?.activeFilter || 'EVERYTHING',
    selectedGroupIds: preference?.selectedGroupIds || [],
    feedParameters,
    visibleGroupIds,
    hasPrimaryOrg,
    primaryOrgId,
    secondaryOrgIds,
    loading,
    setFilter,
    resetFilter,
    refreshPreference,
  };

  return (
    <FeedFilterContext.Provider value={value}>
      {children}
    </FeedFilterContext.Provider>
  );
};

// Custom hook to use FeedFilterContext
export const useFeedFilter = (): FeedFilterContextType => {
  const context = useContext(FeedFilterContext);
  if (context === undefined) {
    throw new Error('useFeedFilter must be used within a FeedFilterProvider');
  }
  return context;
};
