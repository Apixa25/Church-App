import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useActiveContext } from '../contexts/ActiveContextContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useGroup } from '../contexts/GroupContext';

// ============================================================================
// CONTEXT SWITCHER COMPONENT
// ============================================================================
// This component allows users to switch between their Church Primary,
// Family Primary, and Groups contexts. It appears in the dashboard header when
// a user has both primaries OR any groups.
//
// When the user switches context:
// - The dashboard header changes to show the selected organization/group
// - Quick Actions become scoped to that organization (not for groups)
// - Community Stats show that organization's data (not for groups)
// - Donations go to that organization (not for groups)
// - The Feed Filter updates to show the selected context's posts
//
// Priority order for auto-selection: Family > Church > Group
// ============================================================================

const SwitcherContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;

  @media (max-width: 480px) {
    display: block;
    width: 100%; /* Will be overridden by parent .feed-view-toggle > * rule to 90% */
  }
`;

const SwitcherButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-elevated, #2a2a3e);
  border: 1px solid var(--border-primary, #3a3a4e);
  border-radius: var(--border-radius-sm, 6px);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  transition: all 0.2s ease;
  white-space: nowrap;
  pointer-events: auto;
  position: relative;
  z-index: 1;

  &:hover {
    background: var(--bg-tertiary, #1e1e2e);
    border-color: var(--border-glow, #5b7fff);
    box-shadow: 0 0 8px var(--button-primary-glow, rgba(91, 127, 255, 0.3));
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 12px 16px;
    font-size: 14px;
    gap: 8px;
    justify-content: center;
    background: var(--bg-elevated, #2a2a3e);
    border: 1px solid var(--border-primary, #3a3a4e);
    border-radius: 25px; /* Pill shape */
    color: var(--text-primary, #fff);
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    &:hover {
      background: var(--bg-tertiary, #1e1e2e);
      border-color: var(--border-glow, #5b7fff);
      box-shadow: 0 0 8px var(--button-primary-glow, rgba(91, 127, 255, 0.3));
    }

    &:active {
      transform: scale(0.98);
    }
  }
`;

const OrgIcon = styled.span`
  font-size: 16px;
  flex-shrink: 0;
`;

const OrgLogo = styled.img`
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid var(--border-primary, #3a3a4e);
  flex-shrink: 0;
`;

const OrgName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;

  @media (max-width: 480px) {
    max-width: 150px;
  }
`;

const DropdownArrow = styled.span<{ $isOpen: boolean }>`
  font-size: 10px;
  transition: transform 0.2s ease;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

/* 
 * iOS Safari Fix: Using React Portal to render dropdown outside the dashboard-header DOM tree.
 * This completely escapes the stacking context created by backdrop-filter: blur() on iOS Safari.
 * Only visible on mobile (max-width: 480px) - desktop uses the regular Dropdown.
 */
const PortalOverlay = styled.div<{ $isOpen: boolean }>`
  display: none; /* Hidden on desktop */
  
  @media (max-width: 480px) {
    display: ${props => props.$isOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99998;
  }
`;

const PortalDropdown = styled.div<{ $isOpen: boolean }>`
  display: none; /* Hidden on desktop */
  
  @media (max-width: 480px) {
    display: ${props => props.$isOpen ? 'block' : 'none'};
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - 32px);
    max-width: 400px;
    background: var(--bg-tertiary, #1e1e2e);
    border: 1px solid var(--border-primary, #3a3a4e);
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 99999;
    max-height: 80vh;
    overflow-y: auto;
  }
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: var(--bg-tertiary, #1e1e2e);
  border: 1px solid var(--border-primary, #3a3a4e);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  transition: all 0.2s ease;

  @media (max-width: 480px) {
    /* Hide on mobile - use portal version instead */
    display: none !important;
  }
`;

const DropdownHeader = styled.div`
  padding: 12px 16px;
  background: var(--gradient-primary, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
  color: white;
`;

const DropdownTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.9;
`;

const DropdownSubtitle = styled.div`
  font-size: 11px;
  opacity: 0.7;
  margin-top: 2px;
`;

const DropdownOptions = styled.div`
  padding: 8px;
  background: var(--bg-secondary, #252538);
`;

const OptionButton = styled.button<{ $isActive: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.$isActive ? 'var(--bg-elevated, #2a2a3e)' : 'transparent'};
  border: 2px solid ${props => props.$isActive ? 'var(--accent-primary, #667eea)' : 'transparent'};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  pointer-events: auto;
  position: relative;
  z-index: 2;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: var(--bg-elevated, #2a2a3e);
    border-color: var(--border-glow, #5b7fff);
  }
`;

const OptionIcon = styled.span`
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary, #1e1e2e);
  border-radius: 8px;
`;

const OptionLogo = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--border-primary, #3a3a4e);
`;

const OptionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const OptionName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #fff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OptionType = styled.div`
  font-size: 11px;
  color: var(--text-secondary, #a0a0b0);
  margin-top: 2px;
`;

const ActiveIndicator = styled.div`
  width: 8px;
  height: 8px;
  background: var(--accent-primary, #667eea);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent-primary, #667eea);
`;

const SectionDivider = styled.div`
  padding: 8px 12px 4px 12px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary, #a0a0b0);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-top: 1px solid var(--border-primary, #3a3a4e);
  margin-top: 4px;
`;

const ContextSwitcher: React.FC = () => {
  const {
    activeContext,
    setActiveContext,
    setActiveGroup,
    hasChurch,
    hasFamily,
    hasGroups,
    showContextSwitcher,
    activeOrganizationName,
    activeOrganizationLogo,
    activeGroupId,
  } = useActiveContext();

  const { churchPrimary, familyPrimary } = useOrganization();
  const { unmutedGroups } = useGroup();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🛡️ Image error states - gracefully fall back to emoji icons when images fail to load
  const [activeLogoError, setActiveLogoError] = useState(false);
  const [churchLogoError, setChurchLogoError] = useState(false);
  const [familyLogoError, setFamilyLogoError] = useState(false);

  // Reset error states when logo URLs change (e.g., user re-uploads logo)
  useEffect(() => {
    setActiveLogoError(false);
  }, [activeOrganizationLogo]);

  useEffect(() => {
    setChurchLogoError(false);
  }, [churchPrimary?.organizationLogoUrl]);

  useEffect(() => {
    setFamilyLogoError(false);
  }, [familyPrimary?.organizationLogoUrl]);

  // Close dropdown when clicking outside
  // Use a ref to track when dropdown was just opened to prevent immediate closure
  const justOpenedRef = useRef(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInDropdown = dropdownRef.current?.contains(target as Node);
      // Check if click is in portal dropdown by looking for the data attribute or checking if it's a button inside
      const isInPortal = target?.closest('[data-portal-dropdown="true"]') !== null;
      const isInOverlay = target?.closest('[class*="PortalOverlay"]') !== null;
      // Also check if it's an option button (they have specific styling/classes)
      const isOptionButton = target?.closest('button')?.getAttribute('type') === 'button' && 
                            (target?.closest('button')?.textContent?.includes('Church') || 
                             target?.closest('button')?.textContent?.includes('Family'));
      
      // Ignore clicks immediately after opening (within 100ms) to prevent the opening click from closing it
      if (justOpenedRef.current) {
        justOpenedRef.current = false;
        return;
      }
      
      // Don't close if click is inside dropdown (regular or portal), on overlay, or on option button
      if (isInDropdown || isInPortal || isInOverlay || isOptionButton) {
        return;
      }
      
      setIsOpen(false);
    };

    if (isOpen) {
      // Mark that dropdown just opened - use setTimeout to ensure this happens after the current event loop
      justOpenedRef.current = true;
      setTimeout(() => {
        justOpenedRef.current = false;
      }, 100);
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        justOpenedRef.current = false;
      };
    }
  }, [isOpen]);

  // Don't render if user doesn't have both primaries
  if (!showContextSwitcher) {
    return null;
  }

  const handleSelect = (context: 'church' | 'family') => {
    if (typeof setActiveContext === 'function') {
      setActiveContext(context);
      setIsOpen(false);
    } else {
      console.error('❌ ContextSwitcher: setActiveContext is not a function!', setActiveContext);
    }
  };

  const getContextIcon = () => {
    if (activeContext === 'church') return '⛪';
    if (activeContext === 'family') return '🏠';
    if (activeContext === 'group') return '👥';
    return '🌍';
  };

  const handleSelectGroup = (groupId: string, groupName: string | undefined, groupImage?: string | null) => {
    if (typeof setActiveGroup === 'function') {
      setActiveGroup(groupId, groupName || 'Group', groupImage);
      setIsOpen(false);
    } else {
      console.error('❌ ContextSwitcher: setActiveGroup is not a function!', setActiveGroup);
    }
  };

  // Extract dropdown content to reuse in both regular and portal dropdowns
  const dropdownContent = (
    <>
      <DropdownHeader>
        <DropdownTitle>Switch Context</DropdownTitle>
        <DropdownSubtitle>Choose which organization to view</DropdownSubtitle>
      </DropdownHeader>

      <DropdownOptions>
        {hasChurch && churchPrimary && (
          <OptionButton
            $isActive={activeContext === 'church'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect('church');
            }}
            type="button"
          >
            {churchPrimary.organizationLogoUrl && !churchLogoError ? (
              <OptionLogo 
                src={churchPrimary.organizationLogoUrl} 
                alt="" 
                crossOrigin="anonymous"
                onError={() => {
                  console.warn('⚠️ Church org logo failed to load, falling back to icon:', churchPrimary.organizationLogoUrl);
                  setChurchLogoError(true);
                }}
              />
            ) : (
              <OptionIcon>⛪</OptionIcon>
            )}
            <OptionContent>
              <OptionName>{churchPrimary.organizationName}</OptionName>
              <OptionType>Church • {churchPrimary.organizationType}</OptionType>
            </OptionContent>
            {activeContext === 'church' && <ActiveIndicator />}
          </OptionButton>
        )}

        {hasFamily && familyPrimary && (
          <OptionButton
            $isActive={activeContext === 'family'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect('family');
            }}
            type="button"
          >
            {familyPrimary.organizationLogoUrl && !familyLogoError ? (
              <OptionLogo
                src={familyPrimary.organizationLogoUrl}
                alt=""
                crossOrigin="anonymous"
                onError={() => {
                  console.warn('⚠️ Family org logo failed to load, falling back to icon:', familyPrimary.organizationLogoUrl);
                  setFamilyLogoError(true);
                }}
              />
            ) : (
              <OptionIcon>🏠</OptionIcon>
            )}
            <OptionContent>
              <OptionName>{familyPrimary.organizationName}</OptionName>
              <OptionType>Family Organization</OptionType>
            </OptionContent>
            {activeContext === 'family' && <ActiveIndicator />}
          </OptionButton>
        )}

        {/* Groups Section */}
        {hasGroups && unmutedGroups.length > 0 && (
          <>
            <SectionDivider>My Groups</SectionDivider>
            {unmutedGroups.map((membership) => (
              <OptionButton
                key={membership.groupId}
                $isActive={activeContext === 'group' && activeGroupId === membership.groupId}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectGroup(membership.groupId, membership.groupName, membership.groupImageUrl);
                }}
                type="button"
              >
                {membership.groupImageUrl ? (
                  <OptionLogo
                    src={membership.groupImageUrl}
                    alt=""
                    crossOrigin="anonymous"
                    onError={(e) => {
                      // Hide the broken image and show fallback
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <OptionIcon>👥</OptionIcon>
                )}
                <OptionContent>
                  <OptionName>{membership.groupName || 'Group'}</OptionName>
                  <OptionType>Group • {membership.role}</OptionType>
                </OptionContent>
                {activeContext === 'group' && activeGroupId === membership.groupId && <ActiveIndicator />}
              </OptionButton>
            ))}
          </>
        )}
      </DropdownOptions>
    </>
  );

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    // If opening, mark that it just opened to prevent immediate closure
    if (newIsOpen) {
      justOpenedRef.current = true;
    }
  };

  return (
    <SwitcherContainer ref={dropdownRef}>
      <SwitcherButton 
        onClick={handleButtonClick}
        type="button"
        aria-label="Switch context"
        aria-expanded={isOpen}
      >
        {activeOrganizationLogo && !activeLogoError ? (
          <OrgLogo 
            src={activeOrganizationLogo} 
            alt="" 
            crossOrigin="anonymous"
            onError={() => {
              console.warn('⚠️ Active org logo failed to load, falling back to icon:', activeOrganizationLogo);
              setActiveLogoError(true);
            }}
          />
        ) : (
          <OrgIcon>{getContextIcon()}</OrgIcon>
        )}
        <OrgName>{activeOrganizationName?.substring(0, 25) || activeOrganizationName}</OrgName>
        <DropdownArrow $isOpen={isOpen}>▼</DropdownArrow>
      </SwitcherButton>

      {/* Desktop: Regular dropdown (no iOS Safari issues on desktop) */}
      <Dropdown $isOpen={isOpen}>
        {dropdownContent}
      </Dropdown>

      {/* Mobile: Portal-based dropdown - renders at document.body level to escape iOS Safari stacking context */}
      {ReactDOM.createPortal(
        <>
          <PortalOverlay $isOpen={isOpen} onClick={() => setIsOpen(false)} />
          <PortalDropdown $isOpen={isOpen} data-portal-dropdown="true">
            {dropdownContent}
          </PortalDropdown>
        </>,
        document.body
      )}
    </SwitcherContainer>
  );
};

export default ContextSwitcher;

