import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import OrganizationCreateForm from './OrganizationCreateForm';
import OrganizationEditForm from './OrganizationEditForm';
import StripeConnectSetup from './StripeConnectSetup';
import OrganizationMembers from './OrganizationMembers';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  tier: string;
  createdAt: string;
  logoUrl?: string;
  memberCount?: number;
  primaryMemberCount?: number;
  stripeConnectAccountId?: string;
  metadata?: Record<string, any>;
}

interface GroupData {
  id: string;
  name: string;
  description?: string;
  type: string;
  memberCount: number;
  createdAt: string;
  creatorName?: string;
  creatorEmail?: string;
  tags?: string[];
}

interface StripeAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  requirementsCurrentlyDue?: string[];
}

interface OrganizationMetrics {
  organizationId: string;
  storageUsed: number;
  storageMediaFiles: number;
  storageDocuments: number;
  storageProfilePics: number;
  apiRequestsCount: number;
  dataTransferBytes: number;
  activeUsersCount: number;
  postsCount: number;
  prayerRequestsCount: number;
  eventsCount: number;
  announcementsCount: number;
  calculatedAt: string;
  storageLimitBytes?: number;
  storageAlertThreshold?: number;
  storageLimitPercent?: number;
  storageLimitStatus?: string;
}

const AdminOrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Record<string, OrganizationMetrics>>({});
  const [loadingMetrics, setLoadingMetrics] = useState<Record<string, boolean>>({});
  const [updatingLimitId, setUpdatingLimitId] = useState<string | null>(null);
  const [stripeConnectOrg, setStripeConnectOrg] = useState<Organization | null>(null);
  const [stripeStatuses, setStripeStatuses] = useState<Record<string, StripeAccountStatus>>({});
  const [membersOrg, setMembersOrg] = useState<Organization | null>(null);
  const [showingGroups, setShowingGroups] = useState(false);

  const getOrgMetadataValue = (org: Organization, key: string): any => {
    if (!org.metadata || typeof org.metadata !== 'object') return undefined;
    return org.metadata[key];
  };

  const isOrgPendingBankingReview = (org: Organization): boolean => {
    const bankingReviewStatus = String(getOrgMetadataValue(org, 'bankingReviewStatus') || '');
    const hasStripeAccount = Boolean(org.stripeConnectAccountId && org.stripeConnectAccountId.trim());
    return bankingReviewStatus.toUpperCase() === 'PENDING_CONTACT' && !hasStripeAccount;
  };

  useEffect(() => {
    if (filterType === 'GROUPS') {
      setShowingGroups(true);
      fetchGroups();
    } else {
      setShowingGroups(false);
      fetchOrganizations();
    }
  }, [filterType]);

  // Re-fetch groups when search term changes (with debounce)
  useEffect(() => {
    if (showingGroups) {
      const timer = setTimeout(() => {
        fetchGroups();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, showingGroups]);

  useEffect(() => {
    // Fetch metrics and Stripe status for all organizations after they're loaded
    if (organizations.length > 0) {
      organizations.forEach(org => {
        fetchMetrics(org.id);
        // Only fetch Stripe status if they have an account ID
        if (org.stripeConnectAccountId) {
          fetchStripeStatus(org.id);
        }
      });
    }
  }, [organizations]);

  const fetchStripeStatus = async (organizationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `${API_BASE_URL}/stripe-connect/account-status/${organizationId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setStripeStatuses(prev => ({ ...prev, [organizationId]: response.data }));
    } catch (err: any) {
      console.error(`Error fetching Stripe status for org ${organizationId}:`, err);
    }
  };

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/organizations/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Raw API response:', response.data);
      console.log('First org createdAt:', response.data[0]?.createdAt);

      // Sort by created date (newest first)
      const sorted = response.data.sort((a: Organization, b: Organization) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrganizations(sorted);
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/groups/admin/all`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { size: 100, search: searchTerm || undefined }
      });

      // Handle paginated response
      const groupsData = response.data.content || response.data;
      
      // Sort by created date (newest first)
      const sorted = groupsData.sort((a: GroupData, b: GroupData) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setGroups(sorted);
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const confirmMessage = `Are you sure you want to delete the group "${groupName}"?\n\n` +
      `This will:\n` +
      `• Remove all members from the group\n` +
      `• Delete all group posts and content\n\n` +
      `This action CANNOT be undone!`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setDeletingGroupId(groupId);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      await axios.delete(`${API_BASE_URL}/groups/admin/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Remove from list
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (err: any) {
      console.error('Error deleting group:', err);
      setError(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const handleStorageLimitUpdate = async (orgId: string, orgName: string) => {
    const currentMetrics = metrics[orgId];
    const currentLimitGb = currentMetrics?.storageLimitBytes
      ? (currentMetrics.storageLimitBytes / Math.pow(1024, 3)).toFixed(2)
      : '0';
    const limitInput = prompt(
      `Set storage limit for "${orgName}" (in GB). Enter 0 for unlimited:`,
      currentLimitGb || '0'
    );

    if (limitInput === null) {
      return;
    }

    const parsedLimit = parseFloat(limitInput);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      alert('Please enter a valid number for the storage limit.');
      return;
    }

    const thresholdInput = prompt(
      'Alert threshold percentage (80-99). Alerts trigger when usage exceeds this value:',
      (currentMetrics?.storageAlertThreshold ?? 80).toString()
    );

    if (thresholdInput === null) {
      return;
    }

    const parsedThreshold = parseInt(thresholdInput, 10);
    if (isNaN(parsedThreshold) || parsedThreshold < 50 || parsedThreshold > 99) {
      alert('Please enter a valid threshold between 50 and 99.');
      return;
    }

    try {
      setUpdatingLimitId(orgId);
      const token = localStorage.getItem('authToken');
      const payload = {
        storageLimitBytes: parsedLimit > 0 ? Math.round(parsedLimit * Math.pow(1024, 3)) : null,
        storageAlertThreshold: parsedThreshold
      };

      await axios.put(`${API_BASE_URL}/organizations/${orgId}/storage-limit`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      await fetchMetrics(orgId);
      alert('Storage limit updated successfully.');
    } catch (err: any) {
      console.error('Error updating storage limit:', err);
      alert(err.response?.data?.message || 'Failed to update storage limit');
    } finally {
      setUpdatingLimitId(null);
    }
  };

  const handleCreateSuccess = (newOrg: Organization) => {
    setOrganizations(prev => [newOrg, ...prev]);
    setShowCreateForm(false);
  };

  const handleEditSuccess = (updatedOrg: Organization) => {
    setOrganizations(prev =>
      prev.map(org => org.id === updatedOrg.id ? updatedOrg : org)
    );
    setEditingOrg(null);
    // Refresh metrics for the updated organization
    if (updatedOrg.id) {
      fetchMetrics(updatedOrg.id);
    }
  };

  const handleStatusChange = async (orgId: string, newStatus: string) => {
    try {
      setUpdatingStatus(orgId);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      await axios.patch(
        `${API_BASE_URL}/organizations/${orgId}/status`,
        null,
        {
          params: { status: newStatus },
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // Update the organization in the list
      setOrganizations(prev =>
        prev.map(org =>
          org.id === orgId ? { ...org, status: newStatus } : org
        )
      );
    } catch (err: any) {
      console.error('Error updating organization status:', err);
      setError(err.response?.data?.message || 'Failed to update organization status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const fetchMetrics = async (orgId: string) => {
    try {
      setLoadingMetrics(prev => ({ ...prev, [orgId]: true }));
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/organizations/${orgId}/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMetrics(prev => ({ ...prev, [orgId]: response.data }));
    } catch (err: any) {
      console.error(`Error fetching metrics for organization ${orgId}:`, err);
      // Don't show error to user, just log it
    } finally {
      setLoadingMetrics(prev => ({ ...prev, [orgId]: false }));
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getLimitStatusColor = (status?: string) => {
    switch (status) {
      case 'CRITICAL':
      case 'OVER_LIMIT':
        return '#ef4444'; // --error
      case 'WARNING':
        return '#f59e0b'; // --warning
      default:
        return '#10b981'; // --success
    }
  };

  const renderStorageLimitInfo = (org: Organization) => {
    const metric = metrics[org.id];
    if (!metric) return null;

    const limitBytes = metric.storageLimitBytes ?? null;
    const percent = metric.storageLimitPercent ?? null;
    const status = metric.storageLimitStatus ?? 'OK';

    return (
      <StorageLimitSection>
        {limitBytes ? (
          <>
            <LimitBar>
              <LimitProgress
                percent={percent ?? 0}
                status={status}
                style={{ width: `${Math.min(percent ?? 0, 100)}%` }}
              />
            </LimitBar>
            <LimitMeta>
              Limit: {formatBytes(limitBytes)} · {percent ?? 0}% used
              <LimitBadge style={{ color: getLimitStatusColor(status) }}>
                {status.replace('_', ' ')}
              </LimitBadge>
            </LimitMeta>
          </>
        ) : (
          <LimitMeta>Limit: Unlimited</LimitMeta>
        )}
        <LimitButton
          onClick={() => handleStorageLimitUpdate(org.id, org.name)}
          disabled={updatingLimitId === org.id}
        >
          {updatingLimitId === org.id ? 'Saving...' : limitBytes ? 'Adjust Limit' : 'Set Limit'}
        </LimitButton>
      </StorageLimitSection>
    );
  };

  const handleDelete = async (orgId: string, orgName: string) => {
    const confirmMessage = `Are you sure you want to delete "${orgName}"?\n\n` +
      `This will permanently delete:\n` +
      `• All posts\n` +
      `• All prayer requests\n` +
      `• All events\n` +
      `• All announcements\n` +
      `• All donations and subscriptions\n` +
      `• All groups\n` +
      `• All organization memberships\n\n` +
      `This action CANNOT be undone!`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setDeletingOrgId(orgId);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      await axios.delete(`${API_BASE_URL}/organizations/${orgId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Remove from list
      setOrganizations(prev => prev.filter(org => org.id !== orgId));
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      setError(err.response?.data?.message || 'Failed to delete organization');
    } finally {
      setDeletingOrgId(null);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || filterType === 'GROUPS' || org.type === filterType;
    return matchesSearch && matchesType;
  });

  const filteredGroups = groups.filter(group => {
    if (!searchTerm) return true;
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (group.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (group.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const pendingBankingReviewOrganizations = organizations.filter(isOrgPendingBankingReview);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CHURCH': return '#5b7fff'; // --accent-primary
      case 'MINISTRY': return '#8b5cf6'; // --accent-secondary
      case 'NONPROFIT': return '#10b981'; // --success
      case 'GLOBAL': return '#ef4444'; // --error
      default: return '#8a8a9c'; // --text-tertiary
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#10b981'; // --success
      case 'TRIAL': return '#f59e0b'; // --warning
      case 'SUSPENDED': return '#ef4444'; // --error
      case 'CANCELLED': return '#8a8a9c'; // --text-tertiary
      default: return '#8a8a9c'; // --text-tertiary
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'PUBLIC': return '#10b981'; // Green
      case 'ORG_PRIVATE': return '#8b5cf6'; // Purple
      case 'CROSS_ORG': return '#3b82f6'; // Blue
      case 'INVITE_ONLY': return '#f59e0b'; // Orange
      default: return '#8a8a9c';
    }
  };

  if (showCreateForm) {
    return (
      <Container>
        <OrganizationCreateForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </Container>
    );
  }

  if (membersOrg) {
    return (
      <>
        <Container>
          <Header>
            <Title>Organizations</Title>
            <CreateButton onClick={() => setShowCreateForm(true)}>
              + Create Organization
            </CreateButton>
          </Header>
        </Container>
        <OrganizationMembers
          organizationId={membersOrg.id}
          organizationName={membersOrg.name}
          onClose={() => setMembersOrg(null)}
        />
      </>
    );
  }

  if (stripeConnectOrg) {
    return (
      <Container>
        <StripeConnectSetup
          organizationId={stripeConnectOrg.id}
          organizationName={stripeConnectOrg.name}
          onSuccess={() => {
            setStripeConnectOrg(null);
            fetchOrganizations();
          }}
          onClose={() => setStripeConnectOrg(null)}
        />
      </Container>
    );
  }

  if (editingOrg) {
    return (
      <Container>
        <OrganizationEditForm
          organization={editingOrg}
          onSuccess={handleEditSuccess}
          onCancel={() => setEditingOrg(null)}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Organizations</Title>
        <CreateButton onClick={() => setShowCreateForm(true)}>
          + Create Organization
        </CreateButton>
      </Header>

      <Controls>
        <SearchInput
          type="text"
          placeholder="Search organizations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FilterSelect value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">All Organizations</option>
          <option value="CHURCH">⛪ Churches</option>
          <option value="MINISTRY">🙏 Ministries</option>
          <option value="NONPROFIT">💝 Nonprofits</option>
          <option value="FAMILY">🏠 Families</option>
          <option value="GENERAL">🌐 General</option>
          <option value="GLOBAL">🌍 Global</option>
          <option value="GROUPS">👥 Groups</option>
        </FilterSelect>
      </Controls>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {!showingGroups && pendingBankingReviewOrganizations.length > 0 && (
        <BankingQueueCard>
          <BankingQueueHeader>
            <h3>🏦 Banking Outreach Queue</h3>
            <span>{pendingBankingReviewOrganizations.length} pending</span>
          </BankingQueueHeader>
          {pendingBankingReviewOrganizations.slice(0, 6).map(org => (
            <BankingQueueItem key={org.id}>
              <div>
                <strong>{org.name}</strong>
                <p>
                  Admin: {String(getOrgMetadataValue(org, 'adminContactName') || 'Not provided')} •{' '}
                  {String(getOrgMetadataValue(org, 'adminContactEmail') || 'No email')} •{' '}
                  {String(getOrgMetadataValue(org, 'adminContactPhone') || 'No phone')}
                </p>
              </div>
              <DonationButton
                onClick={() => setStripeConnectOrg(org)}
                title="Start Stripe Connect setup"
                $status="not-configured"
              >
                <StripeStatusBadge $status="not-configured">⚠</StripeStatusBadge>
                💳 Setup Banking
              </DonationButton>
            </BankingQueueItem>
          ))}
        </BankingQueueCard>
      )}

      {isLoading ? (
        <LoadingMessage>Loading {showingGroups ? 'groups' : 'organizations'}...</LoadingMessage>
      ) : showingGroups ? (
        // Groups View
        filteredGroups.length === 0 ? (
          <EmptyState>
            {searchTerm ? 'No groups match your search' : 'No groups yet.'}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Creator</Th>
                  <Th>Members</Th>
                  <Th>Tags</Th>
                  <Th>Created</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(group => (
                  <Tr key={group.id}>
                    <Td>
                      <OrgName>{group.name}</OrgName>
                      {group.description && (
                        <GroupDescription>{group.description.substring(0, 50)}{group.description.length > 50 ? '...' : ''}</GroupDescription>
                      )}
                    </Td>
                    <Td>
                      <Badge color={getGroupTypeColor(group.type)}>{group.type}</Badge>
                    </Td>
                    <Td>
                      <CreatorInfo>
                        <CreatorName>{group.creatorName || 'Unknown'}</CreatorName>
                        <CreatorEmail>{group.creatorEmail || ''}</CreatorEmail>
                      </CreatorInfo>
                    </Td>
                    <Td>
                      <MemberCount>{group.memberCount}</MemberCount>
                    </Td>
                    <Td>
                      <TagsContainer>
                        {group.tags?.slice(0, 3).map((tag, idx) => (
                          <Tag key={idx}>{tag}</Tag>
                        ))}
                        {group.tags && group.tags.length > 3 && (
                          <Tag>+{group.tags.length - 3}</Tag>
                        )}
                      </TagsContainer>
                    </Td>
                    <Td>{formatDate(group.createdAt)}</Td>
                    <Td>
                      <ActionsGroup>
                        <DeleteButton 
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          disabled={deletingGroupId === group.id}
                        >
                          {deletingGroupId === group.id ? 'Deleting...' : '🗑️ Delete'}
                        </DeleteButton>
                      </ActionsGroup>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Stats>
              Showing {filteredGroups.length} of {groups.length} group{groups.length !== 1 ? 's' : ''}
            </Stats>
          </>
        )
      ) : filteredOrganizations.length === 0 ? (
        <EmptyState>
          {searchTerm || filterType !== 'ALL'
            ? 'No organizations match your filters'
            : 'No organizations yet. Create one to get started!'}
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Tier</Th>
              <Th>Members</Th>
              <Th>Storage</Th>
              <Th>Active Users</Th>
              <Th>Content</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredOrganizations.map(org => (
              <Tr key={org.id}>
                <Td>
                  <OrgName>{org.name}</OrgName>
                </Td>
                <Td>
                  <Code>{org.slug}</Code>
                </Td>
                <Td>
                  <Badge color={getTypeColor(org.type)}>{org.type}</Badge>
                </Td>
                <Td>
                  <StatusSelect
                    value={org.status}
                    onChange={(e) => handleStatusChange(org.id, e.target.value)}
                    disabled={updatingStatus === org.id}
                    color={getStatusColor(org.status)}
                  >
                    <option value="TRIAL">TRIAL</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </StatusSelect>
                </Td>
                <Td>{org.tier}</Td>
                <Td>
                  {org.memberCount !== undefined ? (
                    <MemberCount>
                      {org.memberCount}
                      {org.primaryMemberCount !== undefined && (
                        <span title="Primary members"> ({org.primaryMemberCount})</span>
                      )}
                    </MemberCount>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td>
                  {loadingMetrics[org.id] ? (
                    <span style={{ color: 'var(--text-tertiary)' }}>Loading...</span>
                  ) : metrics[org.id] ? (
                    <StorageInfo>
                      <StorageValue>{formatBytes(metrics[org.id].storageUsed)}</StorageValue>
                      <StorageBreakdown>
                        Media: {formatBytes(metrics[org.id].storageMediaFiles)} | 
                        Docs: {formatBytes(metrics[org.id].storageDocuments)}
                      </StorageBreakdown>
                      {renderStorageLimitInfo(org)}
                    </StorageInfo>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>N/A</span>
                  )}
                </Td>
                <Td>
                  {metrics[org.id] ? (
                    <ActiveUsers>{metrics[org.id].activeUsersCount} active</ActiveUsers>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                  )}
                </Td>
                <Td>
                  {metrics[org.id] ? (
                    <ContentStats>
                      <StatItem>📝 {metrics[org.id].postsCount}</StatItem>
                      <StatItem>🙏 {metrics[org.id].prayerRequestsCount}</StatItem>
                      <StatItem>📅 {metrics[org.id].eventsCount}</StatItem>
                      <StatItem>📢 {metrics[org.id].announcementsCount}</StatItem>
                    </ContentStats>
                  ) : (
                    <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                  )}
                </Td>
                <Td>{formatDate(org.createdAt)}</Td>
                <Td>
                  <ActionsGroup>
                    <MembersButton 
                      onClick={() => setMembersOrg(org)}
                      title="View and manage organization members"
                    >
                      👥 Members
                    </MembersButton>
                    {(() => {
                      const stripeStatus = stripeStatuses[org.id];
                      const isFullyConfigured = stripeStatus?.chargesEnabled && stripeStatus?.payoutsEnabled;
                      const hasAccount = org.stripeConnectAccountId;
                      const needsOnboarding = hasAccount && !isFullyConfigured;
                      const pendingBankingReview = isOrgPendingBankingReview(org);
                      
                      let title = "Setup Stripe Connect for donations";
                      let statusBadge = "⚠";
                      let buttonStatus: 'not-configured' | 'pending' | 'configured' = 'not-configured';
                      
                      if (isFullyConfigured) {
                        title = `Stripe ready ✓ (${org.stripeConnectAccountId?.substring(0, 15)}...)`;
                        statusBadge = "✓";
                        buttonStatus = 'configured';
                      } else if (needsOnboarding) {
                        title = "Complete Stripe onboarding to accept donations";
                        statusBadge = "⏳";
                        buttonStatus = 'pending';
                      } else if (pendingBankingReview) {
                        title = "Banking outreach pending - contact admin and complete Stripe setup";
                        statusBadge = "📨";
                        buttonStatus = 'not-configured';
                      }
                      
                      return (
                        <DonationButton 
                          onClick={() => setStripeConnectOrg(org)}
                          title={title}
                          $status={buttonStatus}
                        >
                          <StripeStatusBadge $status={buttonStatus}>{statusBadge}</StripeStatusBadge>
                          💳 Donations
                        </DonationButton>
                      );
                    })()}
                    <EditButton 
                      onClick={() => setEditingOrg(org)}
                    >
                      Edit
                    </EditButton>
                    <DeleteButton 
                      onClick={() => handleDelete(org.id, org.name)}
                      disabled={deletingOrgId === org.id}
                    >
                      {deletingOrgId === org.id ? 'Deleting...' : 'Delete'}
                    </DeleteButton>
                  </ActionsGroup>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Stats>
        Showing {filteredOrganizations.length} of {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
      </Stats>
    </Container>
  );
};

const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
`;

const CreateButton = styled.button`
  padding: 10px 20px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);

  &:hover {
    background: linear-gradient(135deg, var(--accent-primary-dark) 0%, var(--accent-secondary-dark) 100%);
    box-shadow: var(--shadow-md), var(--glow-blue);
    transform: translateY(-1px);
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const BankingQueueCard = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: var(--border-radius-md);
  padding: 16px;
  margin-bottom: 20px;
`;

const BankingQueueHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary);
  }

  span {
    font-size: 13px;
    color: var(--warning);
    font-weight: 600;
  }
`;

const BankingQueueItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--border-primary);

  &:first-of-type {
    border-top: none;
  }

  p {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: var(--text-secondary);
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-sm);
  font-size: 14px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all var(--transition-fast);

  &::placeholder {
    color: var(--text-disabled);
  }

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    background: var(--bg-secondary);
    box-shadow: 0 0 0 3px var(--button-primary-glow);
  }
`;

const FilterSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-sm);
  font-size: 14px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  min-width: 150px;
  transition: all var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px var(--button-primary-glow);
  }

  option {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-elevated);
  border-radius: var(--border-radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-primary);
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  background: var(--bg-tertiary);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border-primary);
`;

const Tr = styled.tr`
  border-bottom: 1px solid var(--border-primary);
  transition: all var(--transition-fast);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--bg-tertiary);
    box-shadow: 0 0 0 1px var(--border-glow);
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 14px;
  color: var(--text-primary);
`;

const OrgName = styled.div`
  font-weight: 500;
  color: var(--text-primary);
`;

const Code = styled.code`
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
`;

const Badge = styled.span<{ color: string }>`
  display: inline-block;
  padding: 4px 10px;
  background: ${props => props.color}22;
  color: ${props => props.color};
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatusSelect = styled.select<{ color: string }>`
  padding: 4px 8px;
  border: 1px solid ${props => props.color}44;
  border-radius: var(--border-radius-sm);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => props.color}22;
  color: ${props => props.color};
  cursor: pointer;
  min-width: 100px;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    background: ${props => props.color}33;
    border-color: ${props => props.color}66;
    box-shadow: 0 0 0 2px ${props => props.color}22;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.color};
    box-shadow: 0 0 0 3px ${props => props.color}22;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  option {
    background: var(--bg-elevated);
    color: var(--text-primary);
    padding: 4px;
  }
`;

const MemberCount = styled.div`
  font-weight: 500;
  color: var(--text-primary);

  span {
    color: var(--text-tertiary);
    font-weight: 400;
    font-size: 12px;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error);
  border-radius: var(--border-radius-sm);
  color: var(--error);
  font-size: 14px;
  margin-bottom: 16px;
  box-shadow: 0 0 10px var(--error-glow);
`;

const LoadingMessage = styled.div`
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
  background: var(--bg-elevated);
  border-radius: var(--border-radius-md);
  border: 2px dashed var(--border-primary);
`;

const Stats = styled.div`
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-tertiary);
  text-align: center;
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DonationButton = styled.button<{ $status?: 'not-configured' | 'pending' | 'configured' }>`
  padding: 6px 12px;
  background: ${props => {
    switch (props.$status) {
      case 'configured': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'pending': return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      default: return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    }
  }};
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-xs);
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: ${props => {
      switch (props.$status) {
        case 'configured': return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
        case 'pending': return 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
        default: return 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
      }
    }};
    box-shadow: ${props => {
      switch (props.$status) {
        case 'configured': return 'var(--shadow-sm), 0 0 15px rgba(16, 185, 129, 0.3)';
        case 'pending': return 'var(--shadow-sm), 0 0 15px rgba(59, 130, 246, 0.3)';
        default: return 'var(--shadow-sm), 0 0 15px rgba(245, 158, 11, 0.3)';
      }
    }};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const StripeStatusBadge = styled.span<{ $status?: 'not-configured' | 'pending' | 'configured' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'configured': return '#ffffff';
      case 'pending': return '#dbeafe';
      default: return '#fffbeb';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'configured': return '#10b981';
      case 'pending': return '#2563eb';
      default: return '#d97706';
    }
  }};
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 0 0 2px ${props => {
    switch (props.$status) {
      case 'configured': return '#ffffff22';
      case 'pending': return '#dbeafe22';
      default: return '#fffbeb22';
    }
  }};
`;

const EditButton = styled.button`
  padding: 6px 12px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-xs);

  &:hover {
    background: linear-gradient(135deg, var(--accent-primary-dark) 0%, var(--accent-secondary-dark) 100%);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm), var(--glow-blue);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DeleteButton = styled.button`
  padding: 6px 12px;
  background: var(--error);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-xs);

  &:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm), 0 0 10px var(--error-glow);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--text-disabled);
  }
`;

const StorageInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const StorageValue = styled.div`
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13px;
`;

const StorageBreakdown = styled.div`
  font-size: 10px;
  color: var(--text-tertiary);
`;

const StorageLimitSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
`;

const LimitBar = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  overflow: hidden;
  border: 1px solid var(--border-primary);
`;

const LimitProgress = styled.div<{ percent: number; status?: string }>`
  height: 100%;
  border-radius: 999px;
  background: ${({ status }) => {
    switch (status) {
      case 'CRITICAL':
      case 'OVER_LIMIT':
        return '#ef4444';
      case 'WARNING':
        return '#f59e0b';
      default:
        return '#10b981';
    }
  }};
  box-shadow: 0 0 4px ${({ status }) => {
    switch (status) {
      case 'CRITICAL':
      case 'OVER_LIMIT':
        return 'rgba(239, 68, 68, 0.3)';
      case 'WARNING':
        return 'rgba(245, 158, 11, 0.3)';
      default:
        return 'rgba(16, 185, 129, 0.3)';
    }
  }};
`;

const LimitMeta = styled.div`
  font-size: 10px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const LimitBadge = styled.span`
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
`;

const LimitButton = styled.button`
  align-self: flex-start;
  padding: 4px 8px;
  font-size: 10px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--accent-primary);
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover:not(:disabled) {
    background: rgba(91, 127, 255, 0.1);
    box-shadow: var(--shadow-xs);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ActiveUsers = styled.div`
  font-weight: 500;
  color: var(--accent-primary);
  font-size: 13px;
`;

const ContentStats = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
`;

const StatItem = styled.div`
  color: var(--text-secondary);
  white-space: nowrap;
`;

const MembersButton = styled.button`
  padding: 6px 12px;
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-xs);
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm), 0 0 15px rgba(139, 92, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

// Group-specific styled components
const GroupDescription = styled.div`
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
`;

const CreatorInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CreatorName = styled.span`
  font-weight: 500;
  color: var(--text-primary);
  font-size: 13px;
`;

const CreatorEmail = styled.span`
  font-size: 11px;
  color: var(--text-tertiary);
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
  border: 1px solid var(--border-primary);
`;

export default AdminOrganizationManagement;
