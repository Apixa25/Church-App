import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOrganization, Membership } from './OrganizationContext';
import { useGroup, GroupMembership } from './GroupContext';

// ============================================================================
// ACTIVE CONTEXT SYSTEM
// ============================================================================
// This context manages which primary organization (Church, Family, or Group) is
// currently "active" for the dashboard. When active, that organization's or
// group's data is shown in:
// - Dashboard header (name, logo, banner)
// - Quick Actions
// - Community Stats
// - Donations
// - Announcements, Prayers, etc.
//
// The Context Switcher component in the header allows users to switch between
// their Church Primary, Family Primary, and Groups contexts.
//
// Priority order (for auto-selection): Family > Church > Group
// ============================================================================

export type ActiveContextType = 'church' | 'family' | 'group' | 'gathering';

interface ActiveContextState {
  // Current active context
  activeContext: ActiveContextType;

  // The membership data for the currently active context (org or group)
  activeMembership: Membership | null;
  activeGroupMembership: GroupMembership | null;

  // Set active context for organizations
  setActiveContext: (context: ActiveContextType) => void;

  // Set active group (switches context to 'group' and sets the specific group)
  setActiveGroup: (groupId: string, groupName: string, groupImage?: string | null) => void;

  // Convenience flags
  hasChurch: boolean;
  hasFamily: boolean;
  hasGroups: boolean;
  hasBothPrimaries: boolean;
  hasAnyPrimary: boolean;

  // Should show context switcher? (if user has both primaries OR any groups)
  showContextSwitcher: boolean;

  // Get organization/group details for active context
  activeOrganizationId: string | null;
  activeOrganizationName: string;
  activeOrganizationLogo: string | null;
  activeOrganizationType: string | null;

  // Group-specific details (when context is 'group')
  activeGroupId: string | null;
  activeGroupName: string | null;
  activeGroupImage: string | null;
  activeGroupDescription: string | null;
  activeGroupCreatorName: string | null;
}

const ActiveContextContext = createContext<ActiveContextState | undefined>(undefined);

interface ActiveContextProviderProps {
  children: ReactNode;
}

// Local storage keys for persisting active context
const ACTIVE_CONTEXT_STORAGE_KEY = 'gathering_active_context';
const ACTIVE_GROUP_ID_STORAGE_KEY = 'gathering_active_group_id';
const ACTIVE_GROUP_NAME_STORAGE_KEY = 'gathering_active_group_name';
const ACTIVE_GROUP_IMAGE_STORAGE_KEY = 'gathering_active_group_image';

export const ActiveContextProvider: React.FC<ActiveContextProviderProps> = ({ children }) => {
  const { churchPrimary, familyPrimary, loading } = useOrganization();
  const { unmutedGroups, loading: groupsLoading } = useGroup();
  const [activeContext, setActiveContextState] = useState<ActiveContextType>('gathering');

  // Group-specific state
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);
  const [activeGroupImage, setActiveGroupImage] = useState<string | null>(null);

  // Computed flags
  const hasChurch = churchPrimary !== null;
  const hasFamily = familyPrimary !== null;
  const hasGroups = unmutedGroups.length > 0;
  const hasBothPrimaries = hasChurch && hasFamily;
  const hasAnyPrimary = hasChurch || hasFamily;
  // Show context switcher if user has both primaries OR any groups
  const showContextSwitcher = hasBothPrimaries || hasGroups;

  // Load persisted context from localStorage
  useEffect(() => {
    const savedContext = localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY);
    if (savedContext && ['church', 'family', 'group', 'gathering'].includes(savedContext)) {
      setActiveContextState(savedContext as ActiveContextType);

      // If saved context is 'group', also load the saved group details
      if (savedContext === 'group') {
        const savedGroupId = localStorage.getItem(ACTIVE_GROUP_ID_STORAGE_KEY);
        const savedGroupName = localStorage.getItem(ACTIVE_GROUP_NAME_STORAGE_KEY);
        const savedGroupImage = localStorage.getItem(ACTIVE_GROUP_IMAGE_STORAGE_KEY);
        if (savedGroupId && savedGroupName) {
          setActiveGroupId(savedGroupId);
          setActiveGroupName(savedGroupName);
          setActiveGroupImage(savedGroupImage);
        }
      }
    }
  }, []);

  // Auto-select context based on what user has (after loading)
  // Priority order: Family > Church > Group
  useEffect(() => {
    if (loading || groupsLoading) return;

    // Get saved preference
    const savedContext = localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY);
    const savedGroupId = localStorage.getItem(ACTIVE_GROUP_ID_STORAGE_KEY);

    // Check if saved group still exists in user's groups
    const savedGroupStillValid = savedContext === 'group' && savedGroupId &&
      unmutedGroups.some(g => g.groupId === savedGroupId);

    // If user explicitly saved a group preference and it's still valid, honor it
    if (savedGroupStillValid) {
      setActiveContextState('group');
      return;
    }

    // Priority: Family > Church > Group > Gathering
    if (hasFamily) {
      // User has family - check if they explicitly chose church or group
      if (savedContext === 'church' && hasChurch) {
        setActiveContextState('church');
      } else {
        setActiveContextState('family'); // Default to family (highest priority)
      }
    } else if (hasChurch) {
      // No family, but has church
      setActiveContextState('church');
    } else if (hasGroups) {
      // No primaries, but has groups - auto-select first group
      const firstGroup = unmutedGroups[0];
      setActiveContextState('group');
      setActiveGroupId(firstGroup.groupId);
      setActiveGroupName(firstGroup.groupName || 'Group');
      setActiveGroupImage(null); // GroupMembership doesn't have image, will be fetched if needed
    } else {
      // Has neither - show generic "The Gathering" dashboard
      setActiveContextState('gathering');
    }
  }, [hasChurch, hasFamily, hasGroups, loading, groupsLoading, unmutedGroups]);

  // Set active context and persist to localStorage
  const setActiveContext = (context: ActiveContextType) => {
    console.log('🔄 Switching active context to:', context);
    setActiveContextState(context);
    localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, context);

    // Clear group-specific data if switching away from group
    if (context !== 'group') {
      setActiveGroupId(null);
      setActiveGroupName(null);
      setActiveGroupImage(null);
      localStorage.removeItem(ACTIVE_GROUP_ID_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_GROUP_NAME_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_GROUP_IMAGE_STORAGE_KEY);
    }
  };

  // Set active group (switches context to 'group' and sets the specific group)
  const setActiveGroup = (groupId: string, groupName: string, groupImage?: string | null) => {
    console.log('🔄 Switching to group:', groupName, groupId);
    setActiveContextState('group');
    setActiveGroupId(groupId);
    setActiveGroupName(groupName);
    setActiveGroupImage(groupImage || null);

    // Persist to localStorage
    localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, 'group');
    localStorage.setItem(ACTIVE_GROUP_ID_STORAGE_KEY, groupId);
    localStorage.setItem(ACTIVE_GROUP_NAME_STORAGE_KEY, groupName);
    if (groupImage) {
      localStorage.setItem(ACTIVE_GROUP_IMAGE_STORAGE_KEY, groupImage);
    } else {
      localStorage.removeItem(ACTIVE_GROUP_IMAGE_STORAGE_KEY);
    }
  };

  // Determine active membership based on context
  const activeMembership: Membership | null =
    activeContext === 'church' ? churchPrimary :
    activeContext === 'family' ? familyPrimary :
    null;

  // Find the active group membership (if context is 'group')
  const activeGroupMembership: GroupMembership | null =
    activeContext === 'group' && activeGroupId
      ? unmutedGroups.find(g => g.groupId === activeGroupId) || null
      : null;

  // Derived values for the active context
  // When context is 'group', use group name/image; otherwise use organization
  const activeOrganizationId = activeContext === 'group' ? null : (activeMembership?.organizationId || null);
  const activeOrganizationName = activeContext === 'group'
    ? (activeGroupName || 'Group')
    : (activeMembership?.organizationName || 'The Gathering');
  const activeOrganizationLogo = activeContext === 'group'
    ? activeGroupImage
    : (activeMembership?.organizationLogoUrl || null);
  const activeOrganizationType = activeContext === 'group' ? 'GROUP' : (activeMembership?.organizationType || null);

  // Group description and creator from the active group membership
  const activeGroupDescription = activeGroupMembership?.groupDescription || null;
  const activeGroupCreatorName = activeGroupMembership?.groupCreatorName || null;

  const value: ActiveContextState = {
    activeContext,
    activeMembership,
    activeGroupMembership,
    setActiveContext,
    setActiveGroup,
    hasChurch,
    hasFamily,
    hasGroups,
    hasBothPrimaries,
    hasAnyPrimary,
    showContextSwitcher,
    activeOrganizationId,
    activeOrganizationName,
    activeOrganizationLogo,
    activeOrganizationType,
    activeGroupId,
    activeGroupName,
    activeGroupImage,
    activeGroupDescription,
    activeGroupCreatorName,
  };

  return (
    <ActiveContextContext.Provider value={value}>
      {children}
    </ActiveContextContext.Provider>
  );
};

// Custom hook to use ActiveContextContext
export const useActiveContext = (): ActiveContextState => {
  const context = useContext(ActiveContextContext);
  if (context === undefined) {
    throw new Error('useActiveContext must be used within an ActiveContextProvider');
  }
  return context;
};

export default ActiveContextContext;

