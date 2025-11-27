import React, { useState, useRef, useEffect } from 'react';
import { useFeedFilter } from '../contexts/FeedFilterContext';
import { useGroup } from '../contexts/GroupContext';
import { useActiveContext } from '../contexts/ActiveContextContext';
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

const FilterIcon = styled.span`
  font-size: 16px;
`;

const FilterLabel = styled.span``;

const DropdownIcon = styled.span<{ $isOpen: boolean }>`
  font-size: 12px;
  transition: transform 0.2s;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const Dropdown = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 320px;
  max-width: 400px;
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s;
`;

const DropdownHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
`;

const DropdownTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const DropdownSubtitle = styled.div`
  font-size: 13px;
  color: #666;
`;

const DropdownSection = styled.div`
  padding: 12px;
`;

const FilterOption = styled.button<{ $isActive: boolean }>`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: ${props => props.$isActive ? '#f0f7ff' : 'transparent'};
  border: 2px solid ${props => props.$isActive ? '#4a90e2' : 'transparent'};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  margin-bottom: 8px;

  &:hover {
    background: ${props => props.$isActive ? '#f0f7ff' : '#f5f5f5'};
    border-color: ${props => props.$isActive ? '#4a90e2' : '#e0e0e0'};
  }

  &:last-child {
    margin-bottom: 0;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const RadioCircle = styled.div<{ $isActive: boolean }>`
  width: 20px;
  height: 20px;
  border: 2px solid ${props => props.$isActive ? '#4a90e2' : '#ccc'};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  transition: all 0.2s;

  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #4a90e2;
    opacity: ${props => props.$isActive ? 1 : 0};
    transform: scale(${props => props.$isActive ? 1 : 0});
    transition: all 0.2s;
  }
`;

const OptionContent = styled.div`
  flex: 1;
`;

const OptionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const OptionDescription = styled.div`
  font-size: 13px;
  color: #666;
  line-height: 1.4;
`;

const GroupSelectionSection = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
`;

const GroupSelectionTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
`;

const GroupItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f0f7ff;
  }
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const GroupName = styled.span`
  font-size: 13px;
  color: #1a1a1a;
  flex: 1;
`;

const GroupMemberCount = styled.span`
  font-size: 12px;
  color: #666;
`;

const ApplyButton = styled.button`
  width: 100%;
  padding: 12px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 12px;

  &:hover {
    background: #3a7bc8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 13px;
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 13px;
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: #fee;
  border: 2px solid #fcc;
  border-radius: 8px;
  color: #c00;
  font-size: 13px;
  margin: 12px;
`;

const ActiveFilterBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: #4a90e2;
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 4px;
`;

const FeedFilterSelector: React.FC = () => {
  const {
    activeFilter,
    selectedGroupIds,
    hasPrimaryOrg,
    loading: filterLoading,
    setFilter,
  } = useFeedFilter();

  const {
    unmutedGroups,
    loading: groupsLoading,
  } = useGroup();

  // Dual Primary System - context awareness
  const { activeContext, activeOrganizationName, activeOrganizationId } = useActiveContext();
  const { hasChurchPrimary, hasFamilyPrimary, churchPrimary, familyPrimary } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState(activeFilter);
  const [tempSelectedGroups, setTempSelectedGroups] = useState<string[]>(selectedGroupIds);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update temp state when context changes
  useEffect(() => {
    setTempFilter(activeFilter);
    setTempSelectedGroups(selectedGroupIds);
  }, [activeFilter, selectedGroupIds]);

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

  const handleFilterChange = (filter: 'EVERYTHING' | 'ALL' | 'PRIMARY_ONLY' | 'SELECTED_GROUPS') => {
    setTempFilter(filter);
    setError(null);

    // If not selecting groups, clear selection
    if (filter !== 'SELECTED_GROUPS') {
      setTempSelectedGroups([]);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setTempSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      setError(null);

      // Validation
      if (tempFilter === 'SELECTED_GROUPS' && tempSelectedGroups.length === 0) {
        setError('Please select at least one group');
        return;
      }

      // For PRIMARY_ONLY filter, pass the active organization ID
      // Convert null to undefined for type compatibility
      const selectedOrgId = tempFilter === 'PRIMARY_ONLY' ? (activeOrganizationId || undefined) : undefined;

      await setFilter(tempFilter, tempSelectedGroups, selectedOrgId);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update feed filter');
    } finally {
      setApplying(false);
    }
  };

  const getFilterLabel = (): string => {
    switch (activeFilter) {
      case 'EVERYTHING':
        return 'Everything';
      case 'ALL':
        return 'All My Groups';
      case 'PRIMARY_ONLY':
        // Context-aware: show which primary org is being filtered
        if (activeContext === 'church' && churchPrimary) {
          return `⛪ ${churchPrimary.organizationName?.substring(0, 15) || 'Church'}...`;
        } else if (activeContext === 'family' && familyPrimary) {
          return `🏠 ${familyPrimary.organizationName?.substring(0, 15) || 'Family'}...`;
        }
        return 'Primary Org Only';
      case 'SELECTED_GROUPS':
        return `${selectedGroupIds.length} Group${selectedGroupIds.length !== 1 ? 's' : ''}`;
      default:
        return 'Filter Feed';
    }
  };

  const hasChanges = tempFilter !== activeFilter ||
    JSON.stringify(tempSelectedGroups.sort()) !== JSON.stringify(selectedGroupIds.sort());

  if (filterLoading || groupsLoading) {
    return (
      <SelectorContainer>
        <SelectorButton disabled>
          <FilterIcon>🔍</FilterIcon>
          <FilterLabel>Loading...</FilterLabel>
        </SelectorButton>
      </SelectorContainer>
    );
  }

  return (
    <SelectorContainer ref={dropdownRef}>
      <SelectorButton onClick={() => setIsOpen(!isOpen)}>
        <FilterIcon>🔍</FilterIcon>
        <FilterLabel>{getFilterLabel()}</FilterLabel>
        {activeFilter !== 'EVERYTHING' && <ActiveFilterBadge>Active</ActiveFilterBadge>}
        <DropdownIcon $isOpen={isOpen}>▼</DropdownIcon>
      </SelectorButton>

      <Dropdown $isOpen={isOpen}>
        <DropdownHeader>
          <DropdownTitle>Filter Your Feed</DropdownTitle>
          <DropdownSubtitle>
            Choose what posts you want to see
          </DropdownSubtitle>
        </DropdownHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <DropdownSection>
          <FilterOption
            $isActive={tempFilter === 'EVERYTHING'}
            onClick={() => handleFilterChange('EVERYTHING')}
          >
            <RadioCircle $isActive={tempFilter === 'EVERYTHING'} />
            <OptionContent>
              <OptionTitle>🌐 Everything</OptionTitle>
              <OptionDescription>
                See posts from your Church, Family, Groups, the Global Feed, and users you follow
              </OptionDescription>
            </OptionContent>
          </FilterOption>

          <FilterOption
            $isActive={tempFilter === 'ALL'}
            onClick={() => handleFilterChange('ALL')}
          >
            <RadioCircle $isActive={tempFilter === 'ALL'} />
            <OptionContent>
              <OptionTitle>📋 All My Groups</OptionTitle>
              <OptionDescription>
                {(hasChurchPrimary || hasFamilyPrimary)
                  ? 'See posts from your Church, Family, all Groups you\'re in, and users you follow'
                  : 'See posts from all groups you\'re in and users you follow'}
              </OptionDescription>
            </OptionContent>
          </FilterOption>

          <FilterOption
            $isActive={tempFilter === 'PRIMARY_ONLY'}
            onClick={() => handleFilterChange('PRIMARY_ONLY')}
            disabled={!hasChurchPrimary && !hasFamilyPrimary}
          >
            <RadioCircle $isActive={tempFilter === 'PRIMARY_ONLY'} />
            <OptionContent>
              <OptionTitle>
                {activeContext === 'church' ? '⛪ Church Only' : 
                 activeContext === 'family' ? '🏠 Family Only' : 
                 '📍 Active Context Only'}
              </OptionTitle>
              <OptionDescription>
                {(hasChurchPrimary || hasFamilyPrimary)
                  ? `See only posts from ${activeOrganizationName || 'your active organization'}`
                  : 'Set a Church or Family primary to use this filter'}
              </OptionDescription>
            </OptionContent>
          </FilterOption>

          <FilterOption
            $isActive={tempFilter === 'SELECTED_GROUPS'}
            onClick={() => handleFilterChange('SELECTED_GROUPS')}
            disabled={unmutedGroups.length === 0}
          >
            <RadioCircle $isActive={tempFilter === 'SELECTED_GROUPS'} />
            <OptionContent>
              <OptionTitle>👥 Selected Groups Only</OptionTitle>
              <OptionDescription>
                {unmutedGroups.length > 0
                  ? 'Choose specific groups to see in your feed'
                  : 'Join some groups first to use this filter'}
              </OptionDescription>
            </OptionContent>
          </FilterOption>
        </DropdownSection>

        {tempFilter === 'SELECTED_GROUPS' && unmutedGroups.length > 0 && (
          <GroupSelectionSection>
            <GroupSelectionTitle>
              Select Groups ({tempSelectedGroups.length} selected)
            </GroupSelectionTitle>
            <GroupList>
              {unmutedGroups.length === 0 ? (
                <EmptyState>
                  You haven't joined any groups yet
                </EmptyState>
              ) : (
                unmutedGroups.map(membership => (
                  <GroupItem key={membership.id}>
                    <Checkbox
                      type="checkbox"
                      checked={tempSelectedGroups.includes(membership.groupId)}
                      onChange={() => handleGroupToggle(membership.groupId)}
                    />
                    <GroupName>{membership.groupName || 'Unknown Group'}</GroupName>
                    <GroupMemberCount>
                      {membership.role.toLowerCase().charAt(0).toUpperCase() +
                       membership.role.toLowerCase().slice(1)}
                    </GroupMemberCount>
                  </GroupItem>
                ))
              )}
            </GroupList>
          </GroupSelectionSection>
        )}

        <DropdownSection>
          <ApplyButton
            onClick={handleApply}
            disabled={applying || !hasChanges}
          >
            {applying ? 'Applying...' : hasChanges ? 'Apply Filter' : 'No Changes'}
          </ApplyButton>
        </DropdownSection>
      </Dropdown>
    </SelectorContainer>
  );
};

export default FeedFilterSelector;
