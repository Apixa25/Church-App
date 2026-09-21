import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import organizationInviteApi, {
  OrganizationInviteLink,
  inviteErrorMessage,
} from '../services/organizationInviteApi';
import { isOnlyEmojis } from '../utils/emojiUtils';
import { rememberPostLoginRedirect } from '../utils/postLoginRedirect';

/**
 * FamilyInviteJoinPage - /invite/family/:inviteCode
 *
 * Public landing page for a family invite link or QR code. Shows which family the
 * invitee is joining (emoji names get big, friendly treatment), then either joins
 * immediately (logged in) or sends them through login/register and back here.
 *
 * Joining sets the family as the user's Family Primary. If they already have a
 * different family primary we say so and ask for confirmation before switching.
 */

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
  box-shadow: var(--glass-shadow), var(--glass-shadow-glow), var(--glass-inset-highlight);
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

const FamilyBadge = styled.div<{ $emoji?: boolean }>`
  width: ${p => (p.$emoji ? 'auto' : '84px')};
  min-width: 84px;
  height: 84px;
  margin: 0 auto 18px;
  padding: ${p => (p.$emoji ? '0 18px' : '0')};
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${p => (p.$emoji ? 'var(--bg-secondary)' : 'var(--gradient-primary)')};
  color: white;
  font-weight: 700;
  font-size: ${p => (p.$emoji ? '40px' : '34px')};
  letter-spacing: ${p => (p.$emoji ? '4px' : 'normal')};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Eyebrow = styled.p`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-primary);
  text-align: center;
  margin: 0 0 6px 0;
`;

const Title = styled.h1<{ $emoji?: boolean }>`
  font-size: ${p => (p.$emoji ? '30px' : '24px')};
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin: 0 0 8px 0;
  word-break: break-word;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  text-align: center;
  margin: 0 0 24px 0;
  line-height: 1.5;
`;

const PrimaryButton = styled.button`
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

const SecondaryButton = styled.button`
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
  margin-top: 12px;

  &:hover {
    background: var(--bg-elevated);
    border-color: var(--accent-primary);
  }
`;

const Notice = styled.div<{ $tone: 'info' | 'warn' | 'error' | 'success' }>`
  text-align: center;
  padding: 14px 16px;
  margin-bottom: 16px;
  border-radius: var(--border-radius-md);
  font-size: 14px;
  line-height: 1.5;
  color: ${p =>
    p.$tone === 'error' ? '#ef4444'
    : p.$tone === 'success' ? '#22c55e'
    : p.$tone === 'warn' ? '#f59e0b'
    : 'var(--text-secondary)'};
  background: ${p =>
    p.$tone === 'error' ? 'rgba(239, 68, 68, 0.1)'
    : p.$tone === 'success' ? 'rgba(34, 197, 94, 0.1)'
    : p.$tone === 'warn' ? 'rgba(245, 158, 11, 0.12)'
    : 'var(--bg-secondary)'};
  border: 1px solid ${p =>
    p.$tone === 'error' ? 'rgba(239, 68, 68, 0.3)'
    : p.$tone === 'success' ? 'rgba(34, 197, 94, 0.3)'
    : p.$tone === 'warn' ? 'rgba(245, 158, 11, 0.35)'
    : 'transparent'};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
`;

const FamilyInviteJoinPage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { familyPrimary, refreshMemberships } = useOrganization();

  const [linkInfo, setLinkInfo] = useState<OrganizationInviteLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!inviteCode) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const info = await organizationInviteApi.getInviteLinkInfo(inviteCode);
        setLinkInfo(info);
      } catch (err: any) {
        console.error('Error loading family invite link:', err);
        setError(inviteErrorMessage(err, 'This invite link is invalid or has been turned off'));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [inviteCode]);

  const alreadyInThisFamily =
    !!linkInfo && !!familyPrimary && familyPrimary.organizationId === linkInfo.organizationId;
  const hasDifferentFamily =
    !!linkInfo && !!familyPrimary && familyPrimary.organizationId !== linkInfo.organizationId;

  const handleJoin = async () => {
    if (!inviteCode || !linkInfo) return;

    if (hasDifferentFamily && !confirmSwitch) {
      setConfirmSwitch(true);
      return;
    }

    setIsJoining(true);
    setError(null);
    try {
      await organizationInviteApi.joinViaInviteLink(inviteCode);
      await refreshMemberships();
      setJoined(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setError(inviteErrorMessage(err, 'Failed to join this family'));
    } finally {
      setIsJoining(false);
    }
  };

  const handleLogin = () => {
    rememberPostLoginRedirect();
    navigate('/login');
  };

  const handleRegister = () => {
    rememberPostLoginRedirect();
    navigate('/register');
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
            <Notice $tone="error">{error}</Notice>
            <SecondaryButton onClick={() => navigate(isAuthenticated ? '/organizations?focus=family' : '/login')}>
              {isAuthenticated ? 'Find a family group' : 'Go to login'}
            </SecondaryButton>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!linkInfo) return null;

  const emojiName = isOnlyEmojis(linkInfo.organizationName);
  const inviter = linkInfo.createdByName ? `${linkInfo.createdByName} invited you` : "You've been invited";
  const memberText =
    linkInfo.memberCount && linkInfo.memberCount > 0
      ? ` · ${linkInfo.memberCount} ${linkInfo.memberCount === 1 ? 'member' : 'members'}`
      : '';

  return (
    <PageContainer>
      <Card>
        <CardContent>
          <FamilyBadge $emoji={emojiName && !linkInfo.organizationLogoUrl}>
            {linkInfo.organizationLogoUrl ? (
              <img src={linkInfo.organizationLogoUrl} alt={linkInfo.organizationName} />
            ) : emojiName ? (
              <span aria-hidden="true">{linkInfo.organizationName}</span>
            ) : (
              linkInfo.organizationName.charAt(0).toUpperCase()
            )}
          </FamilyBadge>

          <Eyebrow>👨‍👩‍👧 Family group</Eyebrow>
          <Title $emoji={emojiName}>{linkInfo.organizationName}</Title>
          <Subtitle>
            {inviter} to join this family{memberText}. You'll be able to share moments, prayers and
            plans privately with everyone in it.
          </Subtitle>

          {error && <Notice $tone="error">{error}</Notice>}

          {joined ? (
            <>
              <Notice $tone="success">Welcome to the family! Taking you to your feed...</Notice>
              <SecondaryButton onClick={() => navigate('/dashboard')}>Go to my feed</SecondaryButton>
            </>
          ) : alreadyInThisFamily ? (
            <>
              <Notice $tone="info">You're already part of this family.</Notice>
              <SecondaryButton onClick={() => navigate('/dashboard')}>Go to my feed</SecondaryButton>
            </>
          ) : isAuthenticated ? (
            <>
              {hasDifferentFamily && (
                <Notice $tone="warn">
                  You're currently in <strong>{familyPrimary?.organizationName}</strong>. Joining will make{' '}
                  <strong>{linkInfo.organizationName}</strong> your family group instead. You'll stay a member
                  of your old family, but its posts will show as a group rather than as family.
                </Notice>
              )}
              <PrimaryButton onClick={handleJoin} disabled={isJoining}>
                {isJoining
                  ? 'Joining...'
                  : hasDifferentFamily && confirmSwitch
                  ? 'Yes, switch my family group'
                  : 'Join my family'}
              </PrimaryButton>
              {hasDifferentFamily && confirmSwitch && (
                <SecondaryButton onClick={() => navigate('/dashboard')}>Keep my current family</SecondaryButton>
              )}
            </>
          ) : (
            <>
              <PrimaryButton onClick={handleLogin}>Log in to join</PrimaryButton>
              <SecondaryButton onClick={handleRegister}>Create an account</SecondaryButton>
            </>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default FamilyInviteJoinPage;
