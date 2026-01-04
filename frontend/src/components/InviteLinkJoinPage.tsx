import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import groupInviteApi, { GroupInviteLink } from '../services/groupInviteApi';
import styled from 'styled-components';

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-primary);
`;

const Card = styled.div`
  max-width: 450px;
  width: 100%;
  background: var(--glass-bg-solid);
  backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow:
    var(--glass-shadow),
    var(--glass-shadow-glow),
    var(--glass-inset-highlight);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: var(--glass-shine-gradient);
    pointer-events: none;
    border-radius: 20px 20px 0 0;
  }
`;

const CardContent = styled.div`
  position: relative;
  z-index: 1;
  padding: 32px;
`;

const GroupImage = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const GroupImagePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 32px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 24px 0;
`;

const Description = styled.p`
  font-size: 15px;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.6;
  margin: 0 0 24px 0;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
`;

const JoinButton = styled.button`
  width: 100%;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--border-radius-pill);
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: 0 0 12px var(--button-primary-glow);

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 0 20px var(--button-primary-glow);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoginButton = styled.button`
  width: 100%;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  border-radius: var(--border-radius-pill);
  cursor: pointer;
  transition: all var(--transition-base);
  margin-top: 12px;

  &:hover {
    background: var(--bg-elevated);
    box-shadow: 0 0 12px rgba(91, 127, 255, 0.3);
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 20px;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--border-radius-md);
`;

const SuccessState = styled.div`
  text-align: center;
  padding: 20px;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--border-radius-md);
  margin-bottom: 16px;
`;

const AlreadyMemberState = styled.div`
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  margin-bottom: 16px;
`;

const ViewGroupButton = styled.button`
  width: 100%;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-pill);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-elevated);
    border-color: var(--accent-primary);
  }
`;

const InviteLinkJoinPage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [linkInfo, setLinkInfo] = useState<GroupInviteLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Load invite link info
  useEffect(() => {
    const loadLinkInfo = async () => {
      if (!inviteCode) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const info = await groupInviteApi.getInviteLinkInfo(inviteCode);
        setLinkInfo(info);
      } catch (err: any) {
        console.error('Error loading invite link:', err);
        setError(err.response?.data?.message || 'Invalid or expired invite link');
      } finally {
        setIsLoading(false);
      }
    };

    loadLinkInfo();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode || !linkInfo) return;

    setIsJoining(true);
    setError(null);

    try {
      await groupInviteApi.joinViaInviteLink(inviteCode);
      setJoined(true);

      // Navigate to group after short delay
      setTimeout(() => {
        navigate(`/groups/${linkInfo.groupId}`);
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to join group';

      // Check if already a member
      if (errorMessage.toLowerCase().includes('already a member')) {
        setAlreadyMember(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/login');
  };

  const handleViewGroup = () => {
    if (linkInfo) {
      navigate(`/groups/${linkInfo.groupId}`);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <LoadingState>Loading invite...</LoadingState>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (error && !linkInfo) {
    return (
      <PageContainer>
        <Card>
          <CardContent>
            <Title>Invalid Invite</Title>
            <ErrorState>{error}</ErrorState>
            <ViewGroupButton onClick={() => navigate('/groups')} style={{ marginTop: 16 }}>
              Browse Groups
            </ViewGroupButton>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!linkInfo) {
    return null;
  }

  return (
    <PageContainer>
      <Card>
        <CardContent>
          <GroupImage>
            {linkInfo.groupImageUrl ? (
              <img src={linkInfo.groupImageUrl} alt={linkInfo.groupName} />
            ) : (
              <GroupImagePlaceholder>
                {linkInfo.groupName.charAt(0).toUpperCase()}
              </GroupImagePlaceholder>
            )}
          </GroupImage>

          <Title>{linkInfo.groupName}</Title>
          <Subtitle>You've been invited to join this group</Subtitle>

          {linkInfo.groupDescription && (
            <Description>{linkInfo.groupDescription}</Description>
          )}

          {error && <ErrorState style={{ marginBottom: 16 }}>{error}</ErrorState>}

          {joined ? (
            <>
              <SuccessState>
                You've joined {linkInfo.groupName}!
              </SuccessState>
              <ViewGroupButton onClick={handleViewGroup}>
                View Group
              </ViewGroupButton>
            </>
          ) : alreadyMember ? (
            <>
              <AlreadyMemberState>
                You're already a member of this group
              </AlreadyMemberState>
              <ViewGroupButton onClick={handleViewGroup}>
                View Group
              </ViewGroupButton>
            </>
          ) : isAuthenticated ? (
            <JoinButton onClick={handleJoin} disabled={isJoining}>
              {isJoining ? 'Joining...' : 'Join Group'}
            </JoinButton>
          ) : (
            <>
              <JoinButton onClick={handleLogin}>
                Log In to Join
              </JoinButton>
              <LoginButton onClick={() => navigate('/register')}>
                Create Account
              </LoginButton>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default InviteLinkJoinPage;
