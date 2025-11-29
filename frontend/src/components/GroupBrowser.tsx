import React, { useState, useEffect } from 'react';
import { useGroup, Group } from '../contexts/GroupContext';
import { useOrganization } from '../contexts/OrganizationContext';
import organizationGroupApi, { OrganizationGroup } from '../services/organizationGroupApi';
import CreatePostGroupModal from './CreatePostGroupModal';
import styled from 'styled-components';

const BrowserContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: bold;
  color: #1a1a1a;
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
`;

const SearchBar = styled.input`
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }

  &::placeholder {
    color: #999;
  }
`;

const FilterSection = styled.div`
  margin-top: 20px;
`;

const FilterLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const FilterTab = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border: 2px solid ${props => props.active ? '#4a90e2' : '#e0e0e0'};
  background: ${props => props.active ? '#4a90e2' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4a90e2;
    background: ${props => props.active ? '#3a7bc8' : '#f5f5f5'};
  }
`;

const MyGroupsSection = styled.div`
  margin-bottom: 40px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
`;

const CreateButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #3a7bc8;
  }
`;

const GroupTabs = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
`;

const GroupTab = styled.button<{ active: boolean }>`
  padding: 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.active ? '#4a90e2' : '#666'};
  background: none;
  border: none;
  border-bottom: 3px solid ${props => props.active ? '#4a90e2' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: -2px;

  &:hover {
    color: #4a90e2;
  }
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const GroupCard = styled.div`
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #4a90e2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const GroupInfo = styled.div`
  flex: 1;
`;

const GroupName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const GroupDescription = styled.p`
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
`;

const GroupMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: #666;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const VisibilityBadge = styled.span<{ visibility: string }>`
  display: inline-block;
  padding: 4px 8px;
  background: ${props => {
    switch (props.visibility) {
      case 'PUBLIC': return '#e8f5e9';
      case 'ORG_PRIVATE': return '#fff3e0';
      case 'CROSS_ORG': return '#e3f2fd';
      case 'INVITE_ONLY': return '#fce4ec';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch (props.visibility) {
      case 'PUBLIC': return '#2e7d32';
      case 'ORG_PRIVATE': return '#e65100';
      case 'CROSS_ORG': return '#1565c0';
      case 'INVITE_ONLY': return '#c2185b';
      default: return '#666';
    }
  }};
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: #4a90e2;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
`;

const MutedBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  background: #9e9e9e;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
`;

const TagsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const Tag = styled.span`
  padding: 4px 10px;
  background: #f0f0f0;
  color: #555;
  border-radius: 12px;
  font-size: 12px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' | 'muted' }>`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #4a90e2;
          color: white;
          &:hover {
            background: #3a7bc8;
          }
          &:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
        `;
      case 'secondary':
        return `
          background: white;
          color: #4a90e2;
          border: 2px solid #4a90e2;
          &:hover {
            background: #f0f7ff;
          }
          &:disabled {
            border-color: #ccc;
            color: #ccc;
            cursor: not-allowed;
          }
        `;
      case 'danger':
        return `
          background: #e74c3c;
          color: white;
          &:hover {
            background: #c0392b;
          }
        `;
      case 'muted':
        return `
          background: #9e9e9e;
          color: white;
          &:hover {
            background: #757575;
          }
        `;
      default:
        return `
          background: #e0e0e0;
          color: #666;
          &:hover {
            background: #d0d0d0;
          }
        `;
    }
  }}
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  font-size: 16px;
  color: #666;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #666;
`;

const EmptyStateTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const EmptyStateText = styled.div`
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  background: #fee;
  border: 2px solid #fcc;
  border-radius: 8px;
  padding: 12px 16px;
  color: #c00;
  margin-top: 12px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: #efe;
  border: 2px solid #cfc;
  border-radius: 8px;
  padding: 12px 16px;
  color: #090;
  margin-top: 12px;
  font-size: 14px;
`;

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'ORG_PRIVATE' | 'CROSS_ORG' | 'INVITE_ONLY';
type MyGroupsTab = 'UNMUTED' | 'MUTED';

const GroupBrowser: React.FC = () => {
  const {
    myGroups,
    unmutedGroups,
    mutedGroups,
    loading: contextLoading,
    joinGroup,
    leaveGroup,
    muteGroup,
    unmuteGroup,
    searchGroups,
    isMember,
    refreshGroups,
  } = useGroup();

  const { primaryMembership } = useOrganization();

  const [myGroupsTab, setMyGroupsTab] = useState<MyGroupsTab>('UNMUTED');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [orgGroups, setOrgGroups] = useState<OrganizationGroup[]>([]);
  const [orgGroupsLoading, setOrgGroupsLoading] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Search groups when query or filter changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setSearchLoading(true);
        setError(null);

        const result = await searchGroups(searchQuery, 0, 50);

        // Filter by visibility if not ALL
        let filtered = result.content;
        if (visibilityFilter !== 'ALL') {
          filtered = filtered.filter(group => group.visibility === visibilityFilter);
        }

        setSearchResults(filtered);
      } catch (err: any) {
        setError(err.message || 'Failed to search groups');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, visibilityFilter, searchGroups]);

  // Fetch organizations followed as groups
  useEffect(() => {
    const fetchOrgGroups = async () => {
      try {
        setOrgGroupsLoading(true);
        const data = await organizationGroupApi.getFollowedOrganizations();
        setOrgGroups(data);
      } catch (err: any) {
        console.error('Error fetching org groups:', err);
      } finally {
        setOrgGroupsLoading(false);
      }
    };
    fetchOrgGroups();
  }, []);

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    try {
      setActionLoading(groupId);
      setError(null);
      setSuccess(null);

      const membershipCheck = await isMember(groupId);
      if (membershipCheck) {
        setError('You are already a member of this group');
        return;
      }

      await joinGroup(groupId);
      setSuccess(`Successfully joined ${groupName}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    try {
      setActionLoading(groupId);
      setError(null);
      setSuccess(null);

      if (window.confirm(`Are you sure you want to leave ${groupName}?`)) {
        await leaveGroup(groupId);
        setSuccess(`Successfully left ${groupName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to leave group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMuteGroup = async (groupId: string, groupName: string) => {
    try {
      setActionLoading(groupId);
      setError(null);
      setSuccess(null);

      await muteGroup(groupId);
      setSuccess(`Muted ${groupName}. You will no longer see posts from this group in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to mute group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmuteGroup = async (groupId: string, groupName: string) => {
    try {
      setActionLoading(groupId);
      setError(null);
      setSuccess(null);

      await unmuteGroup(groupId);
      setSuccess(`Unmuted ${groupName}. You will now see posts from this group in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to unmute group');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMuteOrgGroup = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      await organizationGroupApi.muteOrganizationAsGroup(orgId);
      // Refresh org groups
      const data = await organizationGroupApi.getFollowedOrganizations();
      setOrgGroups(data);
      setSuccess(`Muted ${orgName}. You will no longer see posts from this organization in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to mute organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmuteOrgGroup = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      await organizationGroupApi.unmuteOrganizationAsGroup(orgId);
      // Refresh org groups
      const data = await organizationGroupApi.getFollowedOrganizations();
      setOrgGroups(data);
      setSuccess(`Unmuted ${orgName}. You will now see posts from this organization in your feed.`);
    } catch (err: any) {
      setError(err.message || 'Failed to unmute organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollowOrgGroup = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      if (window.confirm(`Are you sure you want to unfollow ${orgName}?`)) {
        await organizationGroupApi.unfollowOrganizationAsGroup(orgId);
        // Refresh org groups
        const data = await organizationGroupApi.getFollowedOrganizations();
        setOrgGroups(data);
        setSuccess(`Successfully unfollowed ${orgName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unfollow organization');
    } finally {
      setActionLoading(null);
    }
  };

  const getVisibilityLabel = (visibility: string): string => {
    switch (visibility) {
      case 'PUBLIC': return 'Public';
      case 'ORG_PRIVATE': return 'Organization Private';
      case 'CROSS_ORG': return 'Cross-Organization';
      case 'INVITE_ONLY': return 'Invite Only';
      default: return visibility;
    }
  };

  const renderGroupCard = (group: Group, isMemberOfGroup: boolean, isMutedGroup: boolean = false) => (
    <GroupCard key={group.id}>
      <GroupHeader>
        <GroupInfo>
          <GroupName>
            {group.name}
            {group.userRole && (
              <RoleBadge>
                {group.userRole.charAt(0) + group.userRole.slice(1).toLowerCase()}
              </RoleBadge>
            )}
            {isMutedGroup && <MutedBadge>Muted</MutedBadge>}
          </GroupName>
          {group.description && (
            <GroupDescription>{group.description}</GroupDescription>
          )}
          <GroupMeta>
            <MetaItem>
              <VisibilityBadge visibility={group.visibility}>
                {getVisibilityLabel(group.visibility)}
              </VisibilityBadge>
            </MetaItem>
            <MetaItem>
              <span>👥</span>
              <span>{group.memberCount || 0} members</span>
            </MetaItem>
            {group.organizationName && (
              <MetaItem>
                <span>🏛️</span>
                <span>{group.organizationName}</span>
              </MetaItem>
            )}
          </GroupMeta>
          {group.tags && group.tags.length > 0 && (
            <TagsList>
              {group.tags.map((tag, index) => (
                <Tag key={index}>{tag}</Tag>
              ))}
            </TagsList>
          )}
        </GroupInfo>
      </GroupHeader>

      <ButtonGroup>
        {isMemberOfGroup ? (
          <>
            {isMutedGroup ? (
              <Button
                variant="primary"
                onClick={() => handleUnmuteGroup(group.id, group.name)}
                disabled={actionLoading === group.id}
              >
                {actionLoading === group.id ? 'Unmuting...' : 'Unmute'}
              </Button>
            ) : (
              <Button
                variant="muted"
                onClick={() => handleMuteGroup(group.id, group.name)}
                disabled={actionLoading === group.id}
              >
                {actionLoading === group.id ? 'Muting...' : 'Mute'}
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => handleLeaveGroup(group.id, group.name)}
              disabled={actionLoading === group.id}
            >
              {actionLoading === group.id ? 'Leaving...' : 'Leave Group'}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            onClick={() => handleJoinGroup(group.id, group.name)}
            disabled={actionLoading === group.id}
          >
            {actionLoading === group.id ? 'Joining...' : 'Join Group'}
          </Button>
        )}
      </ButtonGroup>
    </GroupCard>
  );

  if (contextLoading) {
    return <LoadingSpinner>Loading your groups...</LoadingSpinner>;
  }

  const displayedMyGroups = myGroupsTab === 'UNMUTED' ? unmutedGroups : mutedGroups;

  return (
    <BrowserContainer>
      <Header>
        <Title>Discover Groups</Title>
        <Subtitle>
          {primaryMembership
            ? 'Connect with communities that share your interests'
            : 'Join an organization first to access groups'}
        </Subtitle>

        <SearchBar
          type="text"
          placeholder="Search groups by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!primaryMembership}
        />

        <FilterSection>
          <FilterLabel>Visibility</FilterLabel>
          <FilterTabs>
            <FilterTab
              active={visibilityFilter === 'ALL'}
              onClick={() => setVisibilityFilter('ALL')}
            >
              All Groups
            </FilterTab>
            <FilterTab
              active={visibilityFilter === 'PUBLIC'}
              onClick={() => setVisibilityFilter('PUBLIC')}
            >
              Public
            </FilterTab>
            <FilterTab
              active={visibilityFilter === 'ORG_PRIVATE'}
              onClick={() => setVisibilityFilter('ORG_PRIVATE')}
            >
              Organization Only
            </FilterTab>
            <FilterTab
              active={visibilityFilter === 'CROSS_ORG'}
              onClick={() => setVisibilityFilter('CROSS_ORG')}
            >
              Cross-Organization
            </FilterTab>
            <FilterTab
              active={visibilityFilter === 'INVITE_ONLY'}
              onClick={() => setVisibilityFilter('INVITE_ONLY')}
            >
              Invite Only
            </FilterTab>
          </FilterTabs>
        </FilterSection>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {!primaryMembership && (
        <EmptyState>
          <EmptyStateTitle>No Primary Organization</EmptyStateTitle>
          <EmptyStateText>
            You need to join an organization as your primary before you can access groups.
            Visit the Organizations page to get started!
          </EmptyStateText>
        </EmptyState>
      )}

      {primaryMembership && myGroups.length > 0 && (
        <MyGroupsSection>
          <SectionHeader>
            <SectionTitle>My Groups</SectionTitle>
            <CreateButton onClick={() => setShowCreateGroupModal(true)}>
              + Create Group
            </CreateButton>
          </SectionHeader>

          <GroupTabs>
            <GroupTab
              active={myGroupsTab === 'UNMUTED'}
              onClick={() => setMyGroupsTab('UNMUTED')}
            >
              Active ({unmutedGroups.length})
            </GroupTab>
            <GroupTab
              active={myGroupsTab === 'MUTED'}
              onClick={() => setMyGroupsTab('MUTED')}
            >
              Muted ({mutedGroups.length})
            </GroupTab>
          </GroupTabs>

          {displayedMyGroups.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>
                {myGroupsTab === 'UNMUTED' ? 'No active groups' : 'No muted groups'}
              </EmptyStateTitle>
              <EmptyStateText>
                {myGroupsTab === 'UNMUTED'
                  ? 'Join some groups to get started!'
                  : 'You have not muted any groups.'}
              </EmptyStateText>
            </EmptyState>
          ) : (
            <GroupList>
              {displayedMyGroups.map(membership => {
                // Convert membership to Group for rendering
                const group: Group = {
                  id: membership.groupId,
                  name: membership.groupName || 'Unknown Group',
                  visibility: 'PUBLIC', // Default, will be fetched if needed
                  creatorId: '',
                  userRole: membership.role,
                  isMuted: membership.isMuted,
                };
                return renderGroupCard(group, true, membership.isMuted);
              })}
            </GroupList>
          )}
        </MyGroupsSection>
      )}

      {orgGroups.length > 0 && (
        <MyGroupsSection>
          <SectionHeader>
            <SectionTitle>Organizations I Follow</SectionTitle>
          </SectionHeader>
          <Subtitle style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
            These organizations appear in your feed as groups (feed-only view)
          </Subtitle>
          {orgGroupsLoading ? (
            <LoadingSpinner>Loading organizations...</LoadingSpinner>
          ) : (
            <GroupList>
              {orgGroups.map(orgGroup => (
                <GroupCard key={orgGroup.id}>
                  <GroupHeader>
                    <GroupInfo>
                      <GroupName>
                        🏛️ {orgGroup.organization.name}
                        {orgGroup.isMuted && <MutedBadge>Muted</MutedBadge>}
                      </GroupName>
                      <GroupDescription>Organization Feed</GroupDescription>
                      <GroupMeta>
                        <MetaItem>
                          <span>🏛️</span>
                          <span>{orgGroup.organization.type}</span>
                        </MetaItem>
                      </GroupMeta>
                    </GroupInfo>
                  </GroupHeader>
                  <ButtonGroup>
                    {orgGroup.isMuted ? (
                      <Button
                        variant="primary"
                        onClick={() => handleUnmuteOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                        disabled={actionLoading === orgGroup.organization.id}
                      >
                        {actionLoading === orgGroup.organization.id ? 'Unmuting...' : 'Unmute'}
                      </Button>
                    ) : (
                      <Button
                        variant="muted"
                        onClick={() => handleMuteOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                        disabled={actionLoading === orgGroup.organization.id}
                      >
                        {actionLoading === orgGroup.organization.id ? 'Muting...' : 'Mute'}
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      onClick={() => handleUnfollowOrgGroup(orgGroup.organization.id, orgGroup.organization.name)}
                      disabled={actionLoading === orgGroup.organization.id}
                    >
                      {actionLoading === orgGroup.organization.id ? 'Unfollowing...' : 'Unfollow'}
                    </Button>
                  </ButtonGroup>
                </GroupCard>
              ))}
            </GroupList>
          )}
        </MyGroupsSection>
      )}

      {primaryMembership && searchQuery && (
        <>
          <SectionTitle>
            Search Results for "{searchQuery}"
          </SectionTitle>

          {searchLoading ? (
            <LoadingSpinner>Searching...</LoadingSpinner>
          ) : searchResults.length === 0 ? (
            <EmptyState>
              <EmptyStateTitle>No groups found</EmptyStateTitle>
              <EmptyStateText>
                Try adjusting your search or filters
              </EmptyStateText>
            </EmptyState>
          ) : (
            <GroupList>
              {searchResults.map(group => {
                const memberOfGroup = myGroups.some(m => m.groupId === group.id);
                const muted = mutedGroups.some(m => m.groupId === group.id);
                return renderGroupCard(group, memberOfGroup, muted);
              })}
            </GroupList>
          )}
        </>
      )}

      {/* Create Group Modal */}
      <CreatePostGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSuccess={() => {
          // Refresh groups after creation
          refreshGroups();
        }}
      />
    </BrowserContainer>
  );
};

export default GroupBrowser;
