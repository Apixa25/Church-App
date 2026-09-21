import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { Capacitor } from '@capacitor/core';
import { Share as CapacitorShare } from '@capacitor/share';
import organizationInviteApi, {
  OrganizationInviteLink,
  inviteErrorMessage,
} from '../services/organizationInviteApi';

/**
 * FamilyInviteShareModal - "Invite your family".
 *
 * The primary way people join a family group (families are private, so they should not be
 * found by browsing). Shows a QR code and link for the family's current invite, with
 * Copy / Share / Reset. Family ORG_ADMINs get a link created on demand; regular members can
 * still see and share existing links, they just can't mint or reset them.
 */

interface FamilyInviteShareModalProps {
  isOpen: boolean;
  organizationId: string;
  organizationName: string;
  /** True when the current user is an ORG_ADMIN of this family (enables create/reset). */
  canManage: boolean;
  onClose: () => void;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
`;

const Modal = styled.div`
  width: 100%;
  max-width: 440px;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 20px;
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  padding: 24px;
  color: var(--text-primary);
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
`;

const FamilyName = styled.div`
  margin: 2px 0 14px;
  font-size: 15px;
  color: var(--text-secondary);
  word-break: break-word;
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }
`;

const QrWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: white;
  width: fit-content;
`;

const QrCaption = styled.div`
  font-size: 12px;
  color: #444;
  text-align: center;
`;

const LinkRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch;
  margin-bottom: 12px;
`;

const LinkInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
`;

const Actions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 14px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  border: 1px solid ${p =>
    p.$variant === 'primary' ? 'transparent'
    : p.$variant === 'danger' ? 'rgba(239, 68, 68, 0.4)'
    : 'var(--border-primary)'};
  background: ${p =>
    p.$variant === 'primary' ? 'var(--gradient-primary)'
    : p.$variant === 'danger' ? 'rgba(239, 68, 68, 0.08)'
    : 'var(--bg-secondary)'};
  color: ${p =>
    p.$variant === 'primary' ? 'white'
    : p.$variant === 'danger' ? '#ef4444'
    : 'var(--text-primary)'};

  &:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Meta = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
  margin-bottom: 8px;
`;

const Message = styled.div<{ $tone: 'ok' | 'error' | 'info' }>`
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  text-align: center;
  margin-bottom: 10px;
  color: ${p => (p.$tone === 'error' ? '#ef4444' : p.$tone === 'ok' ? '#22c55e' : 'var(--text-secondary)')};
  background: ${p =>
    p.$tone === 'error' ? 'rgba(239, 68, 68, 0.1)' : p.$tone === 'ok' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)'};
`;

const Tip = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  text-align: center;
`;

const FamilyInviteShareModal: React.FC<FamilyInviteShareModalProps> = ({
  isOpen,
  organizationId,
  organizationName,
  canManage,
  onClose,
}) => {
  const [link, setLink] = useState<OrganizationInviteLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (canManage) {
        setLink(await organizationInviteApi.getOrCreateCurrentLink(organizationId));
      } else {
        const links = await organizationInviteApi.getInviteLinks(organizationId);
        setLink(links[0] || null);
        if (!links[0]) {
          setNotice('No invite link yet. Ask a family admin to create one from this screen.');
        }
      }
    } catch (err: any) {
      setError(inviteErrorMessage(err, 'Could not load the invite link'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, canManage]);

  useEffect(() => {
    if (isOpen) {
      loadLink();
    } else {
      setLink(null);
      setError(null);
      setNotice(null);
    }
  }, [isOpen, loadLink]);

  const shareText = `Join our family group "${organizationName}" on The Gathering`;

  const handleCopy = async () => {
    if (!link) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link.inviteUrl);
      } else {
        const tmp = document.createElement('input');
        tmp.value = link.inviteUrl;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      setNotice('Link copied! Send it to your family however you like.');
      setError(null);
    } catch {
      setError('Unable to copy automatically - long-press the link to copy it.');
    }
  };

  const handleShare = async () => {
    if (!link) return;
    setError(null);
    setNotice(null);
    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorShare.share({
          title: 'Invite to our family group',
          text: shareText,
          url: link.inviteUrl,
          dialogTitle: 'Invite your family',
        });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Invite to our family group', text: shareText, url: link.inviteUrl });
        return;
      }
      await handleCopy();
    } catch (err: any) {
      // User cancelling the native sheet throws AbortError - not an error worth showing
      if (err?.name !== 'AbortError') {
        setError('Unable to open the share menu. Try copying the link instead.');
      }
    }
  };

  const handleReset = async () => {
    if (!link || !canManage) return;
    const ok = window.confirm(
      'Reset the invite link? The old link and QR code will stop working, and a new one will be created.'
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await organizationInviteApi.deactivateInviteLink(link.id);
      setLink(await organizationInviteApi.createInviteLink(organizationId));
      setNotice('New invite link created. Anyone with the old link can no longer use it.');
    } catch (err: any) {
      setError(inviteErrorMessage(err, 'Could not reset the invite link'));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-label="Invite your family">
      <Modal onClick={e => e.stopPropagation()}>
        <Header>
          <div>
            <Title>👨‍👩‍👧 Invite your family</Title>
            <FamilyName>{organizationName}</FamilyName>
          </div>
          <CloseButton type="button" onClick={onClose} aria-label="Close">✕</CloseButton>
        </Header>

        {loading && <Message $tone="info">Preparing your invite link...</Message>}
        {error && <Message $tone="error">{error}</Message>}
        {notice && !error && <Message $tone="ok">{notice}</Message>}

        {link && (
          <>
            <QrWrap>
              <QRCodeSVG value={link.inviteUrl} size={196} level="M" marginSize={1} />
              <QrCaption>Scan with a phone camera to join</QrCaption>
            </QrWrap>

            <LinkRow>
              <LinkInput
                readOnly
                value={link.inviteUrl}
                onFocus={e => e.currentTarget.select()}
                aria-label="Family invite link"
              />
            </LinkRow>

            <Actions>
              <ActionButton type="button" $variant="secondary" onClick={handleCopy}>
                📋 Copy link
              </ActionButton>
              <ActionButton type="button" $variant="primary" onClick={handleShare}>
                📤 Share
              </ActionButton>
            </Actions>

            <Meta>
              Used {link.useCount} {link.useCount === 1 ? 'time' : 'times'}
              {link.createdByName ? ` · created by ${link.createdByName}` : ''}
            </Meta>

            {canManage && (
              <ActionButton
                type="button"
                $variant="danger"
                onClick={handleReset}
                disabled={busy}
                style={{ width: '100%' }}
              >
                {busy ? 'Resetting...' : '🔄 Reset link'}
              </ActionButton>
            )}

            <Tip>
              Anyone who opens this link can join your family, so share it only with family. Reset it any
              time to lock out the old link.
            </Tip>
          </>
        )}
      </Modal>
    </Overlay>
  );
};

export default FamilyInviteShareModal;
