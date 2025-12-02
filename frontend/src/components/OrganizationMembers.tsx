import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

interface Member {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  role: 'MEMBER' | 'ORG_ADMIN' | 'MODERATOR';
  isPrimary: boolean;
  joinedAt: string;
}

interface OrganizationMembersProps {
  organizationId: string;
  organizationName: string;
  onClose: () => void;
}

const OrganizationMembers: React.FC<OrganizationMembersProps> = ({
  organizationId,
  organizationName,
  onClose
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      const response = await axios.get(
        `${API_BASE_URL}/organizations/${organizationId}/members`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      setMembers(response.data);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromote = async (userId: string, userName: string) => {
    if (!window.confirm(`Promote ${userName} to Organization Admin?\n\nThey will have full control over this organization.`)) {
      return;
    }

    try {
      setActionLoading(userId);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      await axios.post(
        `${API_BASE_URL}/organizations/${organizationId}/members/${userId}/promote`,
        null,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Refresh members list
      await fetchMembers();
    } catch (err: any) {
      console.error('Error promoting member:', err);
      setError(err.response?.data?.message || 'Failed to promote member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (userId: string, userName: string) => {
    if (!window.confirm(`Demote ${userName} from Organization Admin?\n\nThey will become a regular member.`)) {
      return;
    }

    try {
      setActionLoading(userId);
      setError(null);
      const token = localStorage.getItem('authToken');
      
      await axios.post(
        `${API_BASE_URL}/organizations/${organizationId}/members/${userId}/demote`,
        null,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Refresh members list
      await fetchMembers();
    } catch (err: any) {
      console.error('Error demoting member:', err);
      setError(err.response?.data?.message || 'Failed to demote member');
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ORG_ADMIN': return '#f59e0b'; // Orange/gold
      case 'MODERATOR': return '#8b5cf6'; // Purple
      default: return '#6b7280'; // Gray
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ORG_ADMIN': return '🏛️ Organization Admin';
      case 'MODERATOR': return '🛡️ Moderator';
      default: return '👤 Member';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const orgAdminCount = members.filter(m => m.role === 'ORG_ADMIN').length;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>
            👥 Members of {organizationName}
          </Title>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {isLoading ? (
          <LoadingMessage>Loading members...</LoadingMessage>
        ) : members.length === 0 ? (
          <EmptyState>No members found</EmptyState>
        ) : (
          <>
            <Stats>
              Total Members: {members.length} | 
              Organization Admins: {orgAdminCount}
            </Stats>

            <MembersList>
              {members.map((member) => (
                <MemberCard key={member.id}>
                  <MemberInfo>
                    <Avatar>
                      {member.userAvatarUrl ? (
                        <img src={member.userAvatarUrl} alt={member.userName} />
                      ) : (
                        <AvatarPlaceholder>
                          {member.userName.charAt(0).toUpperCase()}
                        </AvatarPlaceholder>
                      )}
                    </Avatar>
                    <Details>
                      <Name>
                        {member.userName}
                        {member.isPrimary && <PrimaryBadge title="Primary organization">⭐</PrimaryBadge>}
                      </Name>
                      <RoleBadge color={getRoleBadgeColor(member.role)}>
                        {getRoleLabel(member.role)}
                      </RoleBadge>
                      <JoinDate>Joined: {formatDate(member.joinedAt)}</JoinDate>
                    </Details>
                  </MemberInfo>

                  <Actions>
                    {member.role === 'ORG_ADMIN' ? (
                      <DemoteButton
                        onClick={() => handleDemote(member.userId, member.userName)}
                        disabled={actionLoading === member.userId || orgAdminCount <= 1}
                        title={orgAdminCount <= 1 ? 'Cannot demote the last admin' : 'Demote to Member'}
                      >
                        {actionLoading === member.userId ? 'Processing...' : '⬇️ Demote'}
                      </DemoteButton>
                    ) : (
                      <PromoteButton
                        onClick={() => handlePromote(member.userId, member.userName)}
                        disabled={actionLoading === member.userId}
                      >
                        {actionLoading === member.userId ? 'Processing...' : '⬆️ Promote to Admin'}
                      </PromoteButton>
                    )}
                  </Actions>
                </MemberCard>
              ))}
            </MembersList>
          </>
        )}
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const Modal = styled.div`
  background: var(--bg-elevated);
  border-radius: var(--border-radius-lg);
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-primary);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--border-primary);
`;

const Title = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
`;

const ErrorMessage = styled.div`
  margin: 16px 24px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error);
  border-radius: var(--border-radius-sm);
  color: var(--error);
  font-size: 14px;
`;

const LoadingMessage = styled.div`
  padding: 60px 24px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
`;

const EmptyState = styled.div`
  padding: 60px 24px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 14px;
`;

const Stats = styled.div`
  padding: 16px 24px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  gap: 16px;
`;

const MembersList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MemberCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-fast);

  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
    box-shadow: var(--shadow-sm);
  }
`;

const MemberInfo = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--border-primary);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-primary);
  color: white;
  font-size: 20px;
  font-weight: 600;
`;

const Details = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PrimaryBadge = styled.span`
  font-size: 14px;
`;

const RoleBadge = styled.span<{ color: string }>`
  display: inline-block;
  padding: 2px 8px;
  background: ${props => props.color}22;
  color: ${props => props.color};
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  width: fit-content;
`;

const JoinDate = styled.div`
  font-size: 12px;
  color: var(--text-tertiary);
`;

const Actions = styled.div`
  display: flex;
  gap: 8px;
`;

const PromoteButton = styled.button`
  padding: 8px 16px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-xs);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--accent-primary-dark) 0%, var(--accent-secondary-dark) 100%);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm), var(--glow-blue);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DemoteButton = styled.button`
  padding: 8px 16px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    background: var(--bg-secondary);
    border-color: var(--text-secondary);
    color: var(--text-primary);
    box-shadow: var(--shadow-xs);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default OrganizationMembers;

