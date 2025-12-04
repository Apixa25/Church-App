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
    position: fixed;
    top: 50%;
    left: 50%;
    right: auto;
    bottom: auto;
    transform: ${props => props.$isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)'};
    min-width: auto;
    width: calc(100% - 32px);
    max-width: 400px;
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
              onClick={() => handleSelect('family')}
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
        </DropdownOptions>
      </Dropdown>
    </SwitcherContainer>
  );
};

export default ContextSwitcher;

