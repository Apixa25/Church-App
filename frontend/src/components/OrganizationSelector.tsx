import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '../contexts/OrganizationContext';
import styled from 'styled-components';

const SelectorContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const SelectorButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  transition: all 0.2s;

  &:hover {
    border-color: #4a90e2;
    background: #f9f9f9;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const OrgIcon = styled.span`
  font-size: 18px;
`;

const OrgName = styled.span`
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const DropdownIcon = styled.span<{ $isOpen: boolean }>`
  font-size: 12px;
  transition: transform 0.2s;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const DropdownPortal = styled.div<{ $isOpen: boolean; $top: number; $left: number }>`
  position: fixed;
  top: ${props => props.$top}px;
  left: ${props => props.$left}px;
  min-width: 280px;
  max-width: 400px;
  width: calc(100vw - 32px);
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 99999;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s;

  @media (min-width: 769px) {
    width: auto;
  }
`;

const DropdownHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
`;

const DropdownTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
`;

const CurrentOrgCard = styled.div`
  background: #f0f7ff;
  border: 2px solid #4a90e2;
  border-radius: 8px;
  padding: 12px;
`;

const CurrentOrgName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const CurrentOrgMeta = styled.div`
  font-size: 13px;
  color: #666;
  display: flex;
  gap: 8px;
`;

const PrimaryBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #4a90e2;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
`;

const DropdownSection = styled.div`
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;

  &:last-child {
    border-bottom: none;
  }
`;

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const OrgList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const OrgItem = styled.button<{ isActive?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: ${props => props.isActive ? '#f0f7ff' : 'transparent'};
  border: none;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const OrgItemInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const OrgItemName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OrgItemRole = styled.div`
  font-size: 12px;
  color: #666;
`;

const OrgItemActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SecondaryBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #e0e0e0;
  color: #666;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
`;

const ActionButton = styled.button`
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #3a7bc8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
`;

const BrowseButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #3a7bc8;
  }
`;

const BrowseButtonSecondary = styled(BrowseButton)`
  background: #6c757d;
  margin-top: 8px;

  &:hover {
    background: #5a6268;
  }
`;

const HelpText = styled.div`
  font-size: 12px;
  color: #000;
  margin-bottom: 8px;
  line-height: 1.4;
`;

const CooldownNotice = styled.div`
  padding: 8px 12px;
  background: #fff3cd;
  border-radius: 6px;
  font-size: 12px;
  color: #856404;
  margin-top: 8px;
`;

const LoadingSpinner = styled.div`
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 13px;
`;

interface OrganizationSelectorProps {
  onBrowseClick?: () => void;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ onBrowseClick }) => {
  const {
    primaryMembership,
    secondaryMemberships,
    loading,
    // Dual Primary System - use new methods
    setChurchPrimary,
    setFamilyPrimary,
    canBeChurchPrimary,
    canBeFamilyPrimary,
    // Legacy (no longer needed but keep for reference)
    switchPrimaryOrganization,
    canSwitchPrimary,
    getDaysUntilCanSwitch,
  } = useOrganization();

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(true);
  const [daysUntilSwitch, setDaysUntilSwitch] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const isMobile = windowWidth <= 768;
      
      let leftPosition = rect.left;
      
      // On mobile, center the dropdown
      if (isMobile) {
        // On mobile, dropdown uses calc(100vw - 32px), so position at 16px from left (centered with margins)
        leftPosition = 16;
      } else {
        // On desktop, position relative to button but ensure it doesn't go off screen
        const desktopDropdownWidth = 400; // max-width
        leftPosition = Math.max(16, Math.min(rect.left, windowWidth - desktopDropdownWidth - 16));
      }
      
      setDropdownPosition({
        top: rect.bottom + 8,
        left: leftPosition
      });
    }
  }, [isOpen]);

  // Check switch eligibility
  useEffect(() => {
    const checkEligibility = async () => {
      try {
        const eligible = await canSwitchPrimary();
        setCanSwitch(eligible);
        if (!eligible) {
          const days = await getDaysUntilCanSwitch();
          setDaysUntilSwitch(days);
        }
      } catch (err) {
        console.error('Error checking switch eligibility:', err);
      }
    };

    if (isOpen && primaryMembership) {
      checkEligibility();
    }
  }, [isOpen, primaryMembership, canSwitchPrimary, getDaysUntilCanSwitch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickInsideButton = buttonRef.current?.contains(target);
      const isClickInsideDropdown = dropdownRef.current?.contains(target);

      if (!isClickInsideButton && !isClickInsideDropdown) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSwitchPrimary = async (orgId: string, orgName: string, orgType?: string) => {
    // No more cooldown check needed! Users can switch freely now.
    // Keeping the check structure in case we want to add rate limiting later.

    try {
      setSwitching(orgId);
      
      // Dual Primary System: Detect organization type and call appropriate endpoint
      if (orgType && canBeFamilyPrimary(orgType)) {
        // FAMILY type organizations go to Family Primary slot
        console.log('🏠 Setting Family Primary:', orgName, '(type:', orgType, ')');
        await setFamilyPrimary(orgId);
      } else {
        // CHURCH, MINISTRY, NONPROFIT, GENERAL go to Church Primary slot
        console.log('⛪ Setting Church Primary:', orgName, '(type:', orgType, ')');
        await setChurchPrimary(orgId);
      }
      
      setIsOpen(false);
    } catch (err: any) {
      console.error('Failed to switch primary organization:', err);
      alert(err.message || 'Failed to switch primary organization');
    } finally {
      setSwitching(null);
    }
  };

  const handleBrowse = () => {
    setIsOpen(false);
    if (onBrowseClick) {
      onBrowseClick();
    } else {
      // Use React Router navigation instead of window.location
      navigate('/organizations');
    }
  };

  const handleBrowseGroups = () => {
    setIsOpen(false);
    navigate('/groups');
  };

  // Helper function to get the appropriate icon based on organization type
  const getOrganizationIcon = (orgType?: string): string => {
    if (!orgType) {
      return '🏛️'; // Default to courthouse if type is unknown
    }
    
    switch (orgType) {
      case 'CHURCH':
      case 'MINISTRY':
      case 'NONPROFIT':
        return '⛪'; // Church emoji for churches, ministries, and nonprofits
      case 'GENERAL':
        return '🏛️'; // Courthouse emoji for general organizations
      case 'FAMILY':
        return '🏠'; // House emoji for families
      default:
        return '🏛️'; // Default to courthouse
    }
  };

  if (loading) {
    return (
      <SelectorContainer>
        <SelectorButton disabled>
          <OrgIcon>🏛️</OrgIcon>
          <OrgName>Loading...</OrgName>
        </SelectorButton>
      </SelectorContainer>
    );
  }

  // Always show "Group Selector" as the button label for clarity
  const displayName = 'Group Selector';
  const displayIcon = primaryMembership
    ? getOrganizationIcon(primaryMembership.organizationType)
    : '🔍';

  const dropdownContent = isOpen && (
    <DropdownPortal ref={dropdownRef} $isOpen={isOpen} $top={dropdownPosition.top} $left={dropdownPosition.left}>
        {primaryMembership ? (
          <>

            {secondaryMemberships.length > 0 && (
              <DropdownSection>
                <SectionTitle>Secondary Organizations</SectionTitle>
                <OrgList>
                  {secondaryMemberships.map(membership => (
                    <OrgItem key={membership.id}>
                      <OrgItemInfo>
                        <OrgItemName>{membership.organizationName}</OrgItemName>
                        <OrgItemRole>
                          {membership.role.toLowerCase().charAt(0).toUpperCase() +
                           membership.role.toLowerCase().slice(1)}
                        </OrgItemRole>
                      </OrgItemInfo>
                      <OrgItemActions>
                        <SecondaryBadge>SECONDARY</SecondaryBadge>
                        <ActionButton
                          onClick={() => handleSwitchPrimary(
                            membership.organizationId, 
                            membership.organizationName || '',
                            membership.organizationType
                          )}
                          disabled={switching === membership.organizationId}
                          title={membership.organizationType === 'FAMILY' 
                            ? 'Set as Family Primary' 
                            : 'Set as Church Primary'}
                        >
                          {switching === membership.organizationId ? '...' : 'Switch'}
                        </ActionButton>
                      </OrgItemActions>
                    </OrgItem>
                  ))}
                </OrgList>
              </DropdownSection>
            )}

            <DropdownSection>
              <HelpText>For example: a Church or a Family - You can be a part of 2 Organizations MAX</HelpText>
              <BrowseButton onClick={handleBrowse}>
                Find Organizations
              </BrowseButton>
            </DropdownSection>

            <DropdownSection>
              <HelpText>For example: A Bible Study or Camping Trip - You can be a part of unlimited groups</HelpText>
              <BrowseButtonSecondary onClick={handleBrowseGroups}>
                Find Groups
              </BrowseButtonSecondary>
            </DropdownSection>
          </>
        ) : (
          <>
            <DropdownHeader>
              <DropdownTitle>No Primary Organization</DropdownTitle>
              <EmptyState>
                Join an organization to unlock prayers, events, and giving features
              </EmptyState>
            </DropdownHeader>

            {secondaryMemberships.length > 0 && (
              <DropdownSection>
                <SectionTitle>Secondary Organizations</SectionTitle>
                <OrgList>
                  {secondaryMemberships.map(membership => (
                    <OrgItem key={membership.id}>
                      <OrgItemInfo>
                        <OrgItemName>{membership.organizationName}</OrgItemName>
                        <OrgItemRole>
                          {membership.role.toLowerCase().charAt(0).toUpperCase() +
                           membership.role.toLowerCase().slice(1)}
                        </OrgItemRole>
                      </OrgItemInfo>
                      <OrgItemActions>
                        <ActionButton
                          onClick={() => handleSwitchPrimary(
                            membership.organizationId, 
                            membership.organizationName || '',
                            membership.organizationType
                          )}
                          disabled={switching === membership.organizationId}
                          title={membership.organizationType === 'FAMILY' 
                            ? 'Set as Family Primary' 
                            : 'Set as Church Primary'}
                        >
                          {switching === membership.organizationId ? '...' : 'Make Primary'}
                        </ActionButton>
                      </OrgItemActions>
                    </OrgItem>
                  ))}
                </OrgList>
              </DropdownSection>
            )}

            <DropdownSection>
              <HelpText>For example: a Church or a Family - You can be a part of 2 Organizations MAX</HelpText>
              <BrowseButton onClick={handleBrowse}>
                Find Organizations
              </BrowseButton>
            </DropdownSection>

            <DropdownSection>
              <HelpText>For example: A Bible Study or Camping Trip - You can be a part of unlimited groups</HelpText>
              <BrowseButtonSecondary onClick={handleBrowseGroups}>
                Find Groups
              </BrowseButtonSecondary>
            </DropdownSection>
          </>
        )}
    </DropdownPortal>
  );

  return (
    <>
      <SelectorContainer ref={dropdownRef}>
        <SelectorButton ref={buttonRef} onClick={() => setIsOpen(!isOpen)}>
          <OrgIcon>{displayIcon}</OrgIcon>
          <OrgName>{displayName}</OrgName>
          <DropdownIcon $isOpen={isOpen}>▼</DropdownIcon>
        </SelectorButton>
      </SelectorContainer>
      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default OrganizationSelector;
