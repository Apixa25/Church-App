import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
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

  // Memoize axios instance to prevent recreation on every render
  const api = useMemo(() => {
    return axios.create({
      baseURL: API_BASE_URL,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }, [token]);

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

  // Fetch feed preference and parameters - memoized to prevent recreation
  const fetchPreference = useCallback(async () => {
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
  }, [isAuthenticated, api]);

  // Alias for refreshPreference
  const refreshPreference = fetchPreference;

  // Set filter - memoized to prevent recreation
  // 🎯 OPTIMIZED: No longer double-fetches after successful save
  const setFilter = useCallback(async (filter: FeedFilter, groupIds: string[] = [], selectedOrganizationId?: string): Promise<void> => {
    try {
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
      
      // Make API call (fire-and-forget style - we already have the optimistic update)
      await api.post('/feed-preferences', {
        activeFilter: filter,
        selectedGroupIds: filter === 'SELECTED_GROUPS' ? groupIds : [],
        selectedOrganizationId: filter === 'PRIMARY_ONLY' ? selectedOrganizationId : undefined,
      });

      // Clear optimistic update ref - success!
      // 🎯 NO refreshPreference() call - we already have the correct state from optimistic update
      optimisticUpdateRef.current = null;
    } catch (error: any) {
      console.error('Error setting feed filter:', error);
      // Revert optimistic update on error by refreshing from server
      optimisticUpdateRef.current = null;
      await refreshPreference();
      throw new Error(error.response?.data?.message || 'Failed to update feed filter');
    }
  }, [preference, api, refreshPreference]);

  // Reset filter to EVERYTHING (default) - memoized
  const resetFilter = useCallback(async (): Promise<void> => {
    try {
      await api.delete('/feed-preferences');
      await refreshPreference();
    } catch (error: any) {
      console.error('Error resetting feed filter:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset feed filter');
    }
  }, [api, refreshPreference]);

  // Track if we're currently fetching to prevent infinite loops
  const isFetchingRef = useRef(false);
  
  // Initialize preference on mount and when auth changes
  useEffect(() => {
    if (!isFetchingRef.current) {
      isFetchingRef.current = true;
      fetchPreference().finally(() => {
        isFetchingRef.current = false;
      });
    }
  }, [isAuthenticated, token, fetchPreference]);

  // 🎯 When activeOrganizationId changes and filter is PRIMARY_ONLY, update preference
  // Track last synced org ID to prevent infinite loops
  const lastSyncedOrgIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Only update if filter is PRIMARY_ONLY and we have a preference
    if (
      preference &&
      preference.activeFilter === 'PRIMARY_ONLY' &&
      activeOrganizationId &&
      preference.selectedOrganizationId !== activeOrganizationId &&
      lastSyncedOrgIdRef.current !== activeOrganizationId
    ) {
      lastSyncedOrgIdRef.current = activeOrganizationId;
      
      // Update preference optimistically
      setPreference(prev => prev ? {
        ...prev,
        selectedOrganizationId: activeOrganizationId
      } : null);
      
      // Note: We don't persist this to backend automatically because:
      // 1. The backend uses activeOrganizationId from context when PRIMARY_ONLY is active
      // 2. This is just for UI consistency - the actual filtering happens server-side
      // 3. If user wants to persist, they can manually change the filter
    } else if (!activeOrganizationId) {
      // Reset tracking when org ID is cleared
      lastSyncedOrgIdRef.current = null;
    }
  }, [activeOrganizationId, preference]);

  // Ensure selectedGroupIds is always a new array reference for proper React dependency tracking
  const selectedGroupIdsArray = useMemo(() => {
    return preference?.selectedGroupIds 
      ? [...preference.selectedGroupIds] 
      : [];
  }, [preference?.selectedGroupIds]);

  // Memoize context value to prevent unnecessary re-renders
  const value: FeedFilterContextType = useMemo(() => ({
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
  }), [
    preference,
    selectedGroupIdsArray,
    feedParameters,
    visibleGroupIds,
    hasPrimaryOrg,
    primaryOrgId,
    secondaryOrgIds,
    loading,
    setFilter,
    resetFilter,
    refreshPreference,
  ]);

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
