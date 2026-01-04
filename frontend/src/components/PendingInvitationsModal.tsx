import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import groupInviteApi, { GroupInvitation } from '../services/groupInviteApi';
import './PendingInvitationsModal.css';

interface PendingInvitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvitationResponded?: () => void;
}

const PendingInvitationsModal: React.FC<PendingInvitationsModalProps> = ({
  isOpen,
  onClose,
  onInvitationResponded,
}) => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupInviteApi.getPendingInvitations();
      setInvitations(data);
    } catch (err: any) {
      console.error('Error loading invitations:', err);
      setError('Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadInvitations();
    }
  }, [isOpen, loadInvitations]);

  const handleAccept = async (invitation: GroupInvitation) => {
    setRespondingId(invitation.id);
    setError(null);

    try {
      await groupInviteApi.acceptInvitation(invitation.id);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      setSuccess(`Joined ${invitation.groupName}!`);
      onInvitationResponded?.();

      // Navigate to group after short delay
      setTimeout(() => {
        onClose();
        navigate(`/groups/${invitation.groupId}`);
      }, 1000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to accept invitation';
      setError(errorMessage);
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (invitation: GroupInvitation) => {
    setRespondingId(invitation.id);
    setError(null);

    try {
      await groupInviteApi.declineInvitation(invitation.id);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      setSuccess('Invitation declined');
      setTimeout(() => setSuccess(null), 2000);
      onInvitationResponded?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to decline invitation';
      setError(errorMessage);
    } finally {
      setRespondingId(null);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  const handleClose = () => {
    if (!respondingId) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content pending-invitations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Group Invitations</h2>
          <button
            className="modal-close-btn"
            onClick={handleClose}
            disabled={!!respondingId}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="invitations-error">{error}</div>}
          {success && <div className="invitations-success">{success}</div>}

          {isLoading ? (
            <div className="invitations-loading">Loading invitations...</div>
          ) : invitations.length === 0 ? (
            <div className="invitations-empty">
              <div className="empty-icon">📬</div>
              <p>No pending invitations</p>
              <p className="empty-hint">When someone invites you to a group, it will appear here.</p>
            </div>
          ) : (
            <div className="invitations-list">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="invitation-card">
                  <div className="invitation-header">
                    <div className="group-avatar">
                      {invitation.groupImageUrl ? (
                        <img src={invitation.groupImageUrl} alt={invitation.groupName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {invitation.groupName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="invitation-info">
                      <div className="group-name">{invitation.groupName}</div>
                      <div className="inviter-info">
                        Invited by {invitation.inviterName}
                      </div>
                      <div className="invitation-time">{formatTimeAgo(invitation.createdAt)}</div>
                    </div>
                  </div>

                  {invitation.groupDescription && (
                    <div className="group-description">{invitation.groupDescription}</div>
                  )}

                  {invitation.message && (
                    <div className="invitation-message">
                      <span className="message-label">Message:</span>
                      <span className="message-text">"{invitation.message}"</span>
                    </div>
                  )}

                  <div className="invitation-actions">
                    <button
                      className="decline-btn"
                      onClick={() => handleDecline(invitation)}
                      disabled={respondingId === invitation.id}
                    >
                      Decline
                    </button>
                    <button
                      className="accept-btn"
                      onClick={() => handleAccept(invitation)}
                      disabled={respondingId === invitation.id}
                    >
                      {respondingId === invitation.id ? 'Joining...' : 'Accept'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingInvitationsModal;
