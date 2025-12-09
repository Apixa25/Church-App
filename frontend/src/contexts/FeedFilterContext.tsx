import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { useActiveContext } from './ActiveContextContext';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

export type FeedFilter = 'EVERYTHING' | 'ALL' | 'PRIMARY_ONLY' | 'SELECTED_GROUPS';

export interface FeedPreference {
  id: string;
  userId: string;
  activeFilter: FeedFilter;
  selectedGroupIds: string[];
  selectedOrganizationId?: string; // For PRIMARY_ONLY filter - the specific organization ID
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
  setFilter: (filter: FeedFilter, groupIds?: string[], selectedOrganizationId?: string) => Promise<void>;
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
  
  // Ref to track if we're in the middle of an optimistic update
  const optimisticUpdateRef = useRef<{ filter: FeedFilter; groupIds: string[]; selectedOrganizationId?: string } | null>(null);

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
        const prefData = preferenceRes.value.data;
        console.log('📋 FeedFilterContext: Fetched preference:', prefData);
        
        // If we have an optimistic update in progress, only update if the server data differs
        if (optimisticUpdateRef.current) {
          const optimistic = optimisticUpdateRef.current;
          const serverFilter = prefData.activeFilter;
          const serverGroupIds = prefData.selectedGroupIds || [];
          const serverOrgId = prefData.selectedOrganizationId;
          
          // Check if server data matches optimistic update
          const matches = serverFilter === optimistic.filter &&
            JSON.stringify(serverGroupIds.sort()) === JSON.stringify(optimistic.groupIds.sort()) &&
            serverOrgId === optimistic.selectedOrganizationId;
          
          if (matches) {
            console.log('✅ FeedFilterContext: Server data matches optimistic update, keeping optimistic state');
            // Server matches optimistic, so we can keep the optimistic state (it's already set)
            // Just ensure selectedGroupIds is a new array reference
            setPreference(prev => prev ? {
              ...prev,
              selectedGroupIds: prev.selectedGroupIds ? [...prev.selectedGroupIds] : [],
            } : {
              ...prefData,
              selectedGroupIds: prefData.selectedGroupIds ? [...prefData.selectedGroupIds] : [],
            });
          } else {
            console.log('⚠️ FeedFilterContext: Server data differs from optimistic update, using server data');
            // Server differs, use server data
            setPreference({
              ...prefData,
              selectedGroupIds: prefData.selectedGroupIds ? [...prefData.selectedGroupIds] : [],
            });
          }
        } else {
          // No optimistic update, use server data normally
          setPreference({
            ...prefData,
            selectedGroupIds: prefData.selectedGroupIds ? [...prefData.selectedGroupIds] : [],
          });
        }
      } else {
        // Default preference if none exists
        console.log('📋 FeedFilterContext: No preference found, using defaults');
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
  const setFilter = async (filter: FeedFilter, groupIds: string[] = [], selectedOrganizationId?: string): Promise<void> => {
    try {
      console.log('🔧 FeedFilterContext: Setting filter:', filter, 'groupIds:', groupIds, 'selectedOrganizationId:', selectedOrganizationId);
      
      // Optimistically update the preference state BEFORE the API call completes
      // This prevents PostFeed from reacting to stale state
      const optimisticPreference: FeedPreference = {
        ...(preference || {
          id: '',
          userId: '',
          activeFilter: 'EVERYTHING',
          selectedGroupIds: [],
          updatedAt: new Date().toISOString(),
        }),
        activeFilter: filter,
        selectedGroupIds: filter === 'SELECTED_GROUPS' ? [...groupIds] : [],
        selectedOrganizationId: filter === 'PRIMARY_ONLY' ? selectedOrganizationId : undefined,
        updatedAt: new Date().toISOString(),
      };
      
      // Track optimistic update
      optimisticUpdateRef.current = {
        filter,
        groupIds: filter === 'SELECTED_GROUPS' ? [...groupIds] : [],
        selectedOrganizationId: filter === 'PRIMARY_ONLY' ? selectedOrganizationId : undefined,
      };
      
      // Update state immediately (synchronously in the same render cycle)
      setPreference(optimisticPreference);
      console.log('⚡ FeedFilterContext: Optimistically updated preference state to:', filter);
      
      // Make API call
      await api.post('/feed-preferences', {
        activeFilter: filter,
        selectedGroupIds: filter === 'SELECTED_GROUPS' ? groupIds : [],
        selectedOrganizationId: filter === 'PRIMARY_ONLY' ? selectedOrganizationId : undefined,
      });

      console.log('✅ FeedFilterContext: Filter saved to backend');
      
      // Clear optimistic update ref and refresh from server
      optimisticUpdateRef.current = null;
      await refreshPreference();
      console.log('✅ FeedFilterContext: Preference refreshed from server');
    } catch (error: any) {
      console.error('❌ FeedFilterContext: Error setting feed filter:', error);
      // Revert optimistic update on error by refreshing from server
      await refreshPreference();
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

  // 🎯 When activeOrganizationId changes and filter is PRIMARY_ONLY, update preference
  useEffect(() => {
    // Only update if filter is PRIMARY_ONLY and we have a preference
    if (
      preference &&
      preference.activeFilter === 'PRIMARY_ONLY' &&
      activeOrganizationId &&
      preference.selectedOrganizationId !== activeOrganizationId
    ) {
      console.log('🔄 FeedFilterContext: Syncing selectedOrganizationId with active context', {
        from: preference.selectedOrganizationId,
        to: activeOrganizationId
      });
      
      // Update preference optimistically
      setPreference(prev => prev ? {
        ...prev,
        selectedOrganizationId: activeOrganizationId
      } : null);
      
      // Note: We don't persist this to backend automatically because:
      // 1. The backend uses activeOrganizationId from context when PRIMARY_ONLY is active
      // 2. This is just for UI consistency - the actual filtering happens server-side
      // 3. If user wants to persist, they can manually change the filter
    }
  }, [activeOrganizationId, preference]);

  // Ensure selectedGroupIds is always a new array reference for proper React dependency tracking
  const selectedGroupIdsArray = preference?.selectedGroupIds 
    ? [...preference.selectedGroupIds] 
    : [];

  const value: FeedFilterContextType = {
    preference,
    activeFilter: preference?.activeFilter || 'EVERYTHING',
    selectedGroupIds: selectedGroupIdsArray,
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
