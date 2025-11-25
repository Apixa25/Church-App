import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOrganization, Membership } from './OrganizationContext';

// ============================================================================
// ACTIVE CONTEXT SYSTEM
// ============================================================================
// This context manages which primary organization (Church or Family) is 
// currently "active" for the dashboard. When active, that organization's
// data is shown in:
// - Dashboard header (name, logo, banner)
// - Quick Actions
// - Community Stats
// - Donations
// - Announcements, Prayers, etc.
//
// The Context Switcher component in the header allows users to switch between
// their Church Primary and Family Primary contexts.
// ============================================================================

export type ActiveContextType = 'church' | 'family' | 'gathering';

interface ActiveContextState {
  // Current active context
  activeContext: ActiveContextType;
  
  // The membership data for the currently active context
  activeMembership: Membership | null;
  
  // Set active context
  setActiveContext: (context: ActiveContextType) => void;
  
  // Convenience flags
  hasChurch: boolean;
  hasFamily: boolean;
  hasBothPrimaries: boolean;
  hasAnyPrimary: boolean;
  
  // Should show context switcher? (only if user has both Church and Family)
  showContextSwitcher: boolean;
  
  // Get organization details for active context
  activeOrganizationId: string | null;
  activeOrganizationName: string;
  activeOrganizationLogo: string | null;
  activeOrganizationType: string | null;
}

const ActiveContextContext = createContext<ActiveContextState | undefined>(undefined);

interface ActiveContextProviderProps {
  children: ReactNode;
}

// Local storage key for persisting active context
const ACTIVE_CONTEXT_STORAGE_KEY = 'gathering_active_context';

export const ActiveContextProvider: React.FC<ActiveContextProviderProps> = ({ children }) => {
  const { churchPrimary, familyPrimary, loading } = useOrganization();
  const [activeContext, setActiveContextState] = useState<ActiveContextType>('gathering');

  // Computed flags
  const hasChurch = churchPrimary !== null;
  const hasFamily = familyPrimary !== null;
  const hasBothPrimaries = hasChurch && hasFamily;
  const hasAnyPrimary = hasChurch || hasFamily;
  const showContextSwitcher = hasBothPrimaries;

  // Load persisted context from localStorage
  useEffect(() => {
    const savedContext = localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY);
    if (savedContext && ['church', 'family', 'gathering'].includes(savedContext)) {
      setActiveContextState(savedContext as ActiveContextType);
    }
  }, []);

  // Auto-select context based on what user has (after loading)
  useEffect(() => {
    if (loading) return;

    // Get saved preference
    const savedContext = localStorage.getItem(ACTIVE_CONTEXT_STORAGE_KEY);

    if (hasChurch && hasFamily) {
      // User has both - use saved preference or default to church
      if (savedContext === 'family') {
        setActiveContextState('family');
      } else {
        setActiveContextState('church');
      }
    } else if (hasChurch && !hasFamily) {
      // Only has church
      setActiveContextState('church');
    } else if (hasFamily && !hasChurch) {
      // Only has family
      setActiveContextState('family');
    } else {
      // Has neither - show generic "The Gathering" dashboard
      setActiveContextState('gathering');
    }
  }, [hasChurch, hasFamily, loading]);

  // Set active context and persist to localStorage
  const setActiveContext = (context: ActiveContextType) => {
    console.log('🔄 Switching active context to:', context);
    setActiveContextState(context);
    localStorage.setItem(ACTIVE_CONTEXT_STORAGE_KEY, context);
  };

  // Determine active membership based on context
  const activeMembership: Membership | null = 
    activeContext === 'church' ? churchPrimary :
    activeContext === 'family' ? familyPrimary :
    null;

  // Derived values for the active context
  const activeOrganizationId = activeMembership?.organizationId || null;
  const activeOrganizationName = activeMembership?.organizationName || 'The Gathering';
  const activeOrganizationLogo = activeMembership?.organizationLogoUrl || null;
  const activeOrganizationType = activeMembership?.organizationType || null;

  const value: ActiveContextState = {
    activeContext,
    activeMembership,
    setActiveContext,
    hasChurch,
    hasFamily,
    hasBothPrimaries,
    hasAnyPrimary,
    showContextSwitcher,
    activeOrganizationId,
    activeOrganizationName,
    activeOrganizationLogo,
    activeOrganizationType,
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

