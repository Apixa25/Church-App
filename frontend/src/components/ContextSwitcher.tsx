import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useActiveContext } from '../contexts/ActiveContextContext';
import { useOrganization } from '../contexts/OrganizationContext';

// ============================================================================
// CONTEXT SWITCHER COMPONENT
// ============================================================================
// This component allows users to switch between their Church Primary and
// Family Primary contexts. It appears in the dashboard header when a user
// has BOTH a Church Primary and Family Primary organization.
//
// When the user switches context:
// - The dashboard header changes to show the selected organization
// - Quick Actions become scoped to that organization
// - Community Stats show that organization's data
// - Donations go to that organization
// - The Feed Filter "Primary Org Only" option respects the active context
// ============================================================================

const SwitcherContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
`;

const SwitcherButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: white;
  transition: all 0.2s ease;
  min-width: 180px;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const OrgIcon = styled.span`
  font-size: 18px;
`;

const OrgLogo = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.3);
`;

const OrgName = styled.span`
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
`;

const DropdownArrow = styled.span<{ $isOpen: boolean }>`
  font-size: 10px;
  transition: transform 0.2s ease;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  min-width: 240px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  overflow: hidden;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)'};
  transition: all 0.2s ease;
`;

const DropdownHeader = styled.div`
  padding: 12px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
`;

const OptionButton = styled.button<{ $isActive: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.$isActive ? 'linear-gradient(135deg, #f0f4ff 0%, #e8f0ff 100%)' : 'transparent'};
  border: 2px solid ${props => props.$isActive ? '#667eea' : 'transparent'};
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  margin-bottom: 4px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: ${props => props.$isActive ? 'linear-gradient(135deg, #f0f4ff 0%, #e8f0ff 100%)' : '#f5f5f5'};
  }
`;

const OptionIcon = styled.span`
  font-size: 24px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 8px;
`;

const OptionLogo = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
`;

const OptionContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const OptionName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const OptionType = styled.div`
  font-size: 11px;
  color: #666;
  margin-top: 2px;
`;

const ActiveIndicator = styled.div`
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
`;

const ContextSwitcher: React.FC = () => {
  const {
    activeContext,
    setActiveContext,
    hasChurch,
    hasFamily,
    showContextSwitcher,
    activeOrganizationName,
    activeOrganizationLogo,
  } = useActiveContext();

  const { churchPrimary, familyPrimary } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Don't render if user doesn't have both primaries
  if (!showContextSwitcher) {
    return null;
  }

  const handleSelect = (context: 'church' | 'family') => {
    setActiveContext(context);
    setIsOpen(false);
  };

  const getContextIcon = () => {
    if (activeContext === 'church') return '⛪';
    if (activeContext === 'family') return '🏠';
    return '🌍';
  };

  return (
    <SwitcherContainer ref={dropdownRef}>
      <SwitcherButton onClick={() => setIsOpen(!isOpen)}>
        {activeOrganizationLogo ? (
          <OrgLogo src={activeOrganizationLogo} alt="" />
        ) : (
          <OrgIcon>{getContextIcon()}</OrgIcon>
        )}
        <OrgName>{activeOrganizationName}</OrgName>
        <DropdownArrow $isOpen={isOpen}>▼</DropdownArrow>
      </SwitcherButton>

      <Dropdown $isOpen={isOpen}>
        <DropdownHeader>
          <DropdownTitle>Switch Context</DropdownTitle>
          <DropdownSubtitle>Choose which organization to view</DropdownSubtitle>
        </DropdownHeader>

        <DropdownOptions>
          {hasChurch && churchPrimary && (
            <OptionButton
              $isActive={activeContext === 'church'}
              onClick={() => handleSelect('church')}
            >
              {churchPrimary.organizationLogoUrl ? (
                <OptionLogo src={churchPrimary.organizationLogoUrl} alt="" />
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
              onClick={() => handleSelect('family')}
            >
              {familyPrimary.organizationLogoUrl ? (
                <OptionLogo src={familyPrimary.organizationLogoUrl} alt="" />
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
        </DropdownOptions>
      </Dropdown>
    </SwitcherContainer>
  );
};

export default ContextSwitcher;

