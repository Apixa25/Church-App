import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';
import { useActiveContext } from './ActiveContextContext';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

export type FeedFilter = 'EVERYTHING' | 'ALL' | 'PRIMARY_ONLY' | 'SELECTED_GROUPS' | 'CUSTOM';

export type NearbyOrgType = 'CHURCH' | 'MINISTRY' | 'NONPROFIT';

/** Mirrors backend FeedScope.NearbyScope */
export interface NearbyScope {
  radiusMiles: number;
  sameDenominationOnly: boolean;
  denomination?: string | null;
  orgTypes: NearbyOrgType[];
}

/**
 * Mirrors backend FeedScope. This is the single contract every front door
 * (quick chips, natural-language input) produces; the server validates and
 * resolves it deterministically.
 */
export interface FeedScope {
  includeChurchPrimary: boolean;
  includeFamilyPrimary: boolean;
  includeFriends: boolean;
  includeFollowing: boolean;
  includeMyGroups: boolean;
  organizationIds: string[];
  groupIds: string[];
  /** Specific people whose posts to show ("just my mom's posts"). Server-validated. */
  userIds?: string[];
  nearby?: NearbyScope | null;
}

export const emptyFeedScope = (): FeedScope => ({
  includeChurchPrimary: false,
  includeFamilyPrimary: false,
  includeFriends: false,
  includeFollowing: false,
  includeMyGroups: false,
  organizationIds: [],
  groupIds: [],
  userIds: [],
  nearby: null,
});

/** Mirrors backend FeedScopeParseResult */
export interface FeedScopeParseResult {
  scope?: FeedScope | null;
  legacyFilter?: 'EVERYTHING' | 'ALL' | null;
  description?: string;
  confidence: number;
  clarificationQuestion?: string | null;
  warnings: string[];
  source?: string;
  sourceText?: string;
}

export interface FeedPreference {
  id: string;
  userId: string;
  activeFilter: FeedFilter;
  selectedGroupIds: string[];
  selectedOrganizationId?: string; // For PRIMARY_ONLY filter - the specific organization ID
  updatedAt: string;
  // CUSTOM filter
  scope?: FeedScope | null;
  scopeDescription?: string | null;
  scopeSourceText?: string | null;
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

  // CUSTOM scope (natural language + quick chips)
  scope: FeedScope | null;
  scopeDescription: string | null;
  scopeKey: string; // stable hash of the active scope for cache keys

  // Actions
  setFilter: (filter: FeedFilter, groupIds?: string[], selectedOrganizationId?: string) => Promise<void>;
  resetFilter: () => Promise<void>;
  refreshPreference: () => Promise<void>;
  parseScope: (text: string) => Promise<FeedScopeParseResult>;
  previewScope: (scope: FeedScope) => Promise<FeedScopeParseResult>;
  saveScope: (scope: FeedScope, sourceText?: string) => Promise<void>;
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

  // ---- CUSTOM scope actions -------------------------------------------------

  // Preview only - translate free text into a scope. Nothing saved.
  const parseScope = useCallback(async (text: string): Promise<FeedScopeParseResult> => {
    try {
      const res = await api.post('/feed-preferences/parse', { text });
      return res.data as FeedScopeParseResult;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error(error.response?.data?.message || "You've changed your feed a lot recently - try again in a bit.");
      }
      throw new Error(error.response?.data?.message || 'Could not understand that request');
    }
  }, [api]);

  // Preview a chip-built scope (validates + describes server-side). Nothing saved.
  const previewScope = useCallback(async (scope: FeedScope): Promise<FeedScopeParseResult> => {
    const res = await api.post('/feed-preferences/scope/preview', { scope });
    return res.data as FeedScopeParseResult;
  }, [api]);

  // Save a scope and switch to CUSTOM. Optimistic like setFilter.
  const saveScope = useCallback(async (scope: FeedScope, sourceText?: string): Promise<void> => {
    const base: FeedPreference = preference || {
      id: '',
      userId: '',
      activeFilter: 'EVERYTHING',
      selectedGroupIds: [],
      updatedAt: new Date().toISOString(),
    };
    const optimistic: FeedPreference = {
      ...base,
      activeFilter: 'CUSTOM',
      selectedGroupIds: [],
      selectedOrganizationId: undefined,
      scope,
      scopeSourceText: sourceText ?? null,
      updatedAt: new Date().toISOString(),
    };
    optimisticUpdateRef.current = { filter: 'CUSTOM', groupIds: [], selectedOrganizationId: undefined };
    setPreference(optimistic);

    try {
      const res = await api.put('/feed-preferences/scope', { scope, sourceText });
      const saved = res.data as FeedPreference;
      // Server returns the sanitized scope + description; adopt it so the UI shows what is really active
      setPreference({
        ...saved,
        selectedGroupIds: saved.selectedGroupIds ? [...saved.selectedGroupIds] : [],
      });
      optimisticUpdateRef.current = null;
    } catch (error: any) {
      console.error('Error saving feed scope:', error);
      optimisticUpdateRef.current = null;
      await refreshPreference();
      throw new Error(error.response?.data?.message || 'Failed to save feed scope');
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

  // Scope is only "active" when the CUSTOM filter is selected; otherwise the stored
  // scope is just a remembered draft and must not affect cache keys.
  const activeScope = useMemo(
    () => (preference?.activeFilter === 'CUSTOM' ? preference?.scope || null : null),
    [preference?.activeFilter, preference?.scope]
  );
  const scopeKey = useMemo(() => (activeScope ? JSON.stringify(activeScope) : ''), [activeScope]);

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
    scope: activeScope,
    scopeDescription: preference?.activeFilter === 'CUSTOM' ? preference?.scopeDescription || null : null,
    scopeKey,
    setFilter,
    resetFilter,
    refreshPreference,
    parseScope,
    previewScope,
    saveScope,
  }), [
    preference,
    selectedGroupIdsArray,
    feedParameters,
    visibleGroupIds,
    hasPrimaryOrg,
    primaryOrgId,
    secondaryOrgIds,
    loading,
    activeScope,
    scopeKey,
    setFilter,
    resetFilter,
    refreshPreference,
    parseScope,
    previewScope,
    saveScope,
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
