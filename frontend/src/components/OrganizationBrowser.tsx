import React, { useState, useEffect } from 'react';
import { useOrganization, Organization } from '../contexts/OrganizationContext';
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

const FilterTabs = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
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

const MyMembershipsSection = styled.div`
  margin-bottom: 40px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 12px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 15px;
`;

const MembershipCard = styled.div`
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const MembershipInfo = styled.div`
  flex: 1;
`;

const MembershipName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
`;

const MembershipRole = styled.div`
  font-size: 14px;
  color: #666;
`;

const PrimaryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: #4a90e2;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
`;

const SecondaryBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  background: #e0e0e0;
  color: #666;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 8px;
`;

const OrganizationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const OrganizationCard = styled.div`
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: #4a90e2;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const OrgName = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
`;

const OrgType = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
`;

const OrgStats = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 14px;
  color: #666;
`;

const OrgStat = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: 10px 16px;
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
  padding: 60px 20px;
  color: #666;
`;

const EmptyStateTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const EmptyStateText = styled.div`
  font-size: 16px;
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

const CooldownWarning = styled.div`
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  padding: 12px 16px;
  color: #856404;
  margin-top: 12px;
  font-size: 14px;
`;

type OrgTypeFilter = 'ALL' | 'CHURCH' | 'MINISTRY' | 'NONPROFIT';

const OrganizationBrowser: React.FC = () => {
  const {
    primaryMembership,
    secondaryMemberships,
    allMemberships,
    loading: contextLoading,
    joinOrganization,
    leaveOrganization,
    canSwitchPrimary,
    getDaysUntilCanSwitch,
    searchOrganizations,
  } = useOrganization();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrgTypeFilter>('ALL');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canSwitch, setCanSwitch] = useState(true);
  const [daysUntilSwitch, setDaysUntilSwitch] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check if user can switch primary org
  useEffect(() => {
    const checkSwitchEligibility = async () => {
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

    checkSwitchEligibility();
  }, [canSwitchPrimary, getDaysUntilCanSwitch]);

  // Search organizations when query or filter changes
  useEffect(() => {
    const performSearch = async () => {
      try {
        setSearchLoading(true);
        setError(null);

        const query = searchQuery.trim() || '*'; // Use wildcard for empty search
        const result = await searchOrganizations(query, 0, 50);

        // Filter by type if not ALL
        let filtered = result.content;
        if (typeFilter !== 'ALL') {
          filtered = filtered.filter(org => org.type === typeFilter);
        }

        setOrganizations(filtered);
      } catch (err: any) {
        setError(err.message || 'Failed to search organizations');
        setOrganizations([]);
      } finally {
        setSearchLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, typeFilter, searchOrganizations]);

  const handleJoinAsPrimary = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      if (primaryMembership && !canSwitch) {
        setError(`You must wait ${daysUntilSwitch} more days before switching your primary organization.`);
        return;
      }

      await joinOrganization(orgId, true);
      setSuccess(`Successfully joined ${orgName} as your primary organization!`);
    } catch (err: any) {
      setError(err.message || 'Failed to join organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinAsSecondary = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      await joinOrganization(orgId, false);
      setSuccess(`Successfully joined ${orgName} as a secondary organization!`);
    } catch (err: any) {
      setError(err.message || 'Failed to join organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (orgId: string, orgName: string) => {
    try {
      setActionLoading(orgId);
      setError(null);
      setSuccess(null);

      if (window.confirm(`Are you sure you want to leave ${orgName}?`)) {
        await leaveOrganization(orgId);
        setSuccess(`Successfully left ${orgName}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to leave organization');
    } finally {
      setActionLoading(null);
    }
  };

  const isMember = (orgId: string): boolean => {
    return allMemberships.some(m => m.organizationId === orgId);
  };

  const isPrimary = (orgId: string): boolean => {
    return primaryMembership?.organizationId === orgId;
  };

  const isSecondary = (orgId: string): boolean => {
    return secondaryMemberships.some(m => m.organizationId === orgId);
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'CHURCH': return 'Church';
      case 'MINISTRY': return 'Ministry';
      case 'NONPROFIT': return 'Nonprofit';
      case 'GLOBAL': return 'Global Organization';
      default: return type;
    }
  };

  if (contextLoading) {
    return <LoadingSpinner>Loading your memberships...</LoadingSpinner>;
  }

  return (
    <BrowserContainer>
      <Header>
        <Title>Discover Organizations</Title>
        <Subtitle>
          Find and join churches, ministries, and nonprofits in your community
        </Subtitle>

        <SearchBar
          type="text"
          placeholder="Search organizations by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <FilterTabs>
          <FilterTab
            active={typeFilter === 'ALL'}
            onClick={() => setTypeFilter('ALL')}
          >
            All Organizations
          </FilterTab>
          <FilterTab
            active={typeFilter === 'CHURCH'}
            onClick={() => setTypeFilter('CHURCH')}
          >
            Churches
          </FilterTab>
          <FilterTab
            active={typeFilter === 'MINISTRY'}
            onClick={() => setTypeFilter('MINISTRY')}
          >
            Ministries
          </FilterTab>
          <FilterTab
            active={typeFilter === 'NONPROFIT'}
            onClick={() => setTypeFilter('NONPROFIT')}
          >
            Nonprofits
          </FilterTab>
        </FilterTabs>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
      {!canSwitch && primaryMembership && (
        <CooldownWarning>
          You can switch your primary organization again in {daysUntilSwitch} days.
        </CooldownWarning>
      )}

      {allMemberships.length > 0 && (
        <MyMembershipsSection>
          <SectionTitle>My Organizations</SectionTitle>
          {primaryMembership && (
            <MembershipCard>
              <MembershipInfo>
                <MembershipName>
                  {primaryMembership.organizationName}
                  <PrimaryBadge>PRIMARY</PrimaryBadge>
                </MembershipName>
                <MembershipRole>
                  {primaryMembership.role.toLowerCase().charAt(0).toUpperCase() +
                   primaryMembership.role.toLowerCase().slice(1)} •
                  Joined {new Date(primaryMembership.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
              <Button
                variant="danger"
                onClick={() => handleLeave(primaryMembership.organizationId, primaryMembership.organizationName || 'this organization')}
                disabled={actionLoading === primaryMembership.organizationId}
              >
                {actionLoading === primaryMembership.organizationId ? 'Leaving...' : 'Leave'}
              </Button>
            </MembershipCard>
          )}
          {secondaryMemberships.map(membership => (
            <MembershipCard key={membership.id}>
              <MembershipInfo>
                <MembershipName>
                  {membership.organizationName}
                  <SecondaryBadge>SECONDARY</SecondaryBadge>
                </MembershipName>
                <MembershipRole>
                  {membership.role.toLowerCase().charAt(0).toUpperCase() +
                   membership.role.toLowerCase().slice(1)} •
                  Joined {new Date(membership.joinedAt).toLocaleDateString()}
                </MembershipRole>
              </MembershipInfo>
              <Button
                variant="danger"
                onClick={() => handleLeave(membership.organizationId, membership.organizationName || 'this organization')}
                disabled={actionLoading === membership.organizationId}
              >
                {actionLoading === membership.organizationId ? 'Leaving...' : 'Leave'}
              </Button>
            </MembershipCard>
          ))}
        </MyMembershipsSection>
      )}

      <SectionTitle>
        {searchQuery ? `Search Results for "${searchQuery}"` : 'All Organizations'}
      </SectionTitle>

      {searchLoading ? (
        <LoadingSpinner>Searching...</LoadingSpinner>
      ) : organizations.length === 0 ? (
        <EmptyState>
          <EmptyStateTitle>No organizations found</EmptyStateTitle>
          <EmptyStateText>
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Be the first to create an organization!'}
          </EmptyStateText>
        </EmptyState>
      ) : (
        <OrganizationGrid>
          {organizations.map(org => (
            <OrganizationCard key={org.id}>
              <OrgName>{org.name}</OrgName>
              <OrgType>{getTypeLabel(org.type)}</OrgType>
              <OrgStats>
                <OrgStat>
                  <span>👥</span>
                  <span>{org.memberCount || 0} members</span>
                </OrgStat>
                <OrgStat>
                  <span>📊</span>
                  <span>{org.tier}</span>
                </OrgStat>
              </OrgStats>

              {isMember(org.id) ? (
                <ButtonGroup>
                  {isPrimary(org.id) ? (
                    <Button disabled>Your Primary Organization</Button>
                  ) : isSecondary(org.id) ? (
                    <>
                      <Button disabled>Secondary Member</Button>
                      <Button
                        variant="danger"
                        onClick={() => handleLeave(org.id, org.name)}
                        disabled={actionLoading === org.id}
                      >
                        Leave
                      </Button>
                    </>
                  ) : (
                    <Button disabled>Member</Button>
                  )}
                </ButtonGroup>
              ) : (
                <ButtonGroup>
                  <Button
                    variant="primary"
                    onClick={() => handleJoinAsPrimary(org.id, org.name)}
                    disabled={actionLoading === org.id || (!!primaryMembership && !canSwitch)}
                    title={
                      primaryMembership && !canSwitch
                        ? `Wait ${daysUntilSwitch} days to switch primary org`
                        : 'Join as your primary organization for full access'
                    }
                  >
                    {actionLoading === org.id ? 'Joining...' : 'Join as Primary'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleJoinAsSecondary(org.id, org.name)}
                    disabled={actionLoading === org.id}
                    title="Join as secondary to see public posts in your feed"
                  >
                    {actionLoading === org.id ? 'Joining...' : 'Join as Secondary'}
                  </Button>
                </ButtonGroup>
              )}
            </OrganizationCard>
          ))}
        </OrganizationGrid>
      )}
    </BrowserContainer>
  );
};

export default OrganizationBrowser;
