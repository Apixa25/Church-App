import React, { useState, useRef, useEffect } from 'react';
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

const DropdownIcon = styled.span<{ isOpen: boolean }>`
  font-size: 12px;
  transition: transform 0.2s;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const Dropdown = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 280px;
  max-width: 400px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s;
  isolation: isolate;
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
    switchPrimaryOrganization,
    canSwitchPrimary,
    getDaysUntilCanSwitch,
  } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(true);
  const [daysUntilSwitch, setDaysUntilSwitch] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debug: Log when dropdown opens/closes
  useEffect(() => {
    console.log('🔍 OrganizationSelector - Dropdown isOpen:', isOpen);
    if (isOpen && dropdownRef.current) {
      const dropdown = dropdownRef.current.querySelector('[class*="Dropdown"]');
      if (dropdown) {
        const styles = window.getComputedStyle(dropdown);
        console.log('🎨 Dropdown computed styles:', {
          zIndex: styles.zIndex,
          position: styles.position,
          visibility: styles.visibility,
          opacity: styles.opacity,
          transform: styles.transform
        });
      }
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSwitchPrimary = async (orgId: string, orgName: string) => {
    if (!canSwitch) {
      alert(`You must wait ${daysUntilSwitch} more days before switching your primary organization.`);
      return;
    }

    try {
      setSwitching(orgId);
      await switchPrimaryOrganization(orgId);
      setIsOpen(false);
    } catch (err: any) {
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
      // Default behavior: navigate to organizations page
      window.location.href = '/organizations';
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

  const displayName = primaryMembership?.organizationName || 'No Organization';
  const displayIcon = primaryMembership ? '🏛️' : '👤';

  return (
    <SelectorContainer ref={dropdownRef}>
      <SelectorButton onClick={() => setIsOpen(!isOpen)}>
        <OrgIcon>{displayIcon}</OrgIcon>
        <OrgName>{displayName}</OrgName>
        <DropdownIcon isOpen={isOpen}>▼</DropdownIcon>
      </SelectorButton>

      <Dropdown isOpen={isOpen}>
        {primaryMembership ? (
          <>
            <DropdownHeader>
              <DropdownTitle>Current Organization</DropdownTitle>
              <CurrentOrgCard>
                <CurrentOrgName>{primaryMembership.organizationName}</CurrentOrgName>
                <CurrentOrgMeta>
                  <PrimaryBadge>PRIMARY</PrimaryBadge>
                  <span>
                    {primaryMembership.role.toLowerCase().charAt(0).toUpperCase() +
                     primaryMembership.role.toLowerCase().slice(1)}
                  </span>
                </CurrentOrgMeta>
              </CurrentOrgCard>
              {!canSwitch && (
                <CooldownNotice>
                  You can switch your primary organization in {daysUntilSwitch} days
                </CooldownNotice>
              )}
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
                        <SecondaryBadge>SECONDARY</SecondaryBadge>
                        <ActionButton
                          onClick={() => handleSwitchPrimary(membership.organizationId, membership.organizationName || '')}
                          disabled={!canSwitch || switching === membership.organizationId}
                          title={canSwitch ? 'Switch to primary' : `Wait ${daysUntilSwitch} days`}
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
              <BrowseButton onClick={handleBrowse}>
                Browse Organizations
              </BrowseButton>
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
                          onClick={() => handleSwitchPrimary(membership.organizationId, membership.organizationName || '')}
                          disabled={switching === membership.organizationId}
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
              <BrowseButton onClick={handleBrowse}>
                Find Organizations to Join
              </BrowseButton>
            </DropdownSection>
          </>
        )}
      </Dropdown>
    </SelectorContainer>
  );
};

export default OrganizationSelector;
