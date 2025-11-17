import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import OrganizationCreateForm from './OrganizationCreateForm';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  tier: string;
  createdAt: string;
  memberCount?: number;
  primaryMemberCount?: number;
}

const AdminOrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

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

  const handleCreateSuccess = (newOrg: Organization) => {
    setOrganizations(prev => [newOrg, ...prev]);
    setShowCreateForm(false);
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

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || org.type === filterType;
    return matchesSearch && matchesType;
  });

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
      case 'CHURCH': return '#4a90e2';
      case 'MINISTRY': return '#7b68ee';
      case 'NONPROFIT': return '#50c878';
      case 'GLOBAL': return '#ff6b6b';
      default: return '#999';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '#50c878';
      case 'TRIAL': return '#ffa500';
      case 'SUSPENDED': return '#ff6b6b';
      case 'CANCELLED': return '#999';
      default: return '#999';
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
          <option value="ALL">All Types</option>
          <option value="CHURCH">Churches</option>
          <option value="MINISTRY">Ministries</option>
          <option value="NONPROFIT">Nonprofits</option>
          <option value="GLOBAL">Global</option>
        </FilterSelect>
      </Controls>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {isLoading ? (
        <LoadingMessage>Loading organizations...</LoadingMessage>
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
              <Th>Created</Th>
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
                <Td>{formatDate(org.createdAt)}</Td>
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
  color: #1a1a1a;
`;

const CreateButton = styled.button`
  padding: 10px 20px;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #357abd;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const FilterSelect = styled.select`
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  min-width: 150px;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  background: #f8f9fa;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Tr = styled.tr`
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8f9fa;
  }
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 14px;
  color: #333;
`;

const OrgName = styled.div`
  font-weight: 500;
  color: #1a1a1a;
`;

const Code = styled.code`
  padding: 2px 6px;
  background: #f5f5f5;
  border-radius: 3px;
  font-size: 12px;
  font-family: 'Monaco', 'Courier New', monospace;
  color: #666;
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
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => props.color}22;
  color: ${props => props.color};
  cursor: pointer;
  min-width: 100px;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.color}33;
    border-color: ${props => props.color}66;
  }

  &:focus {
    outline: none;
    border-color: ${props => props.color};
    box-shadow: 0 0 0 2px ${props => props.color}22;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  option {
    background: white;
    color: #333;
    padding: 4px;
  }
`;

const MemberCount = styled.div`
  font-weight: 500;

  span {
    color: #999;
    font-weight: 400;
    font-size: 12px;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 14px;
  margin-bottom: 16px;
`;

const LoadingMessage = styled.div`
  padding: 40px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
  background: white;
  border-radius: 8px;
  border: 2px dashed #e0e0e0;
`;

const Stats = styled.div`
  margin-top: 16px;
  font-size: 13px;
  color: #999;
  text-align: center;
`;

export default AdminOrganizationManagement;
