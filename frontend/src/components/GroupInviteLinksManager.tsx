import React, { useState, useEffect, useCallback } from 'react';
import groupInviteApi, { GroupInviteLink } from '../services/groupInviteApi';
import './GroupInviteLinksManager.css';

interface GroupInviteLinksManagerProps {
  groupId: string;
  groupName: string;
}

const GroupInviteLinksManager: React.FC<GroupInviteLinksManagerProps> = ({
  groupId,
  groupName,
}) => {
  const [links, setLinks] = useState<GroupInviteLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Load existing links
  const loadLinks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupInviteApi.getGroupInviteLinks(groupId);
      setLinks(data);
    } catch (err: any) {
      console.error('Error loading invite links:', err);
      setError('Failed to load invite links');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleCreateLink = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const newLink = await groupInviteApi.createInviteLink(groupId);
      setLinks((prev) => [newLink, ...prev]);
      setSuccess('Invite link created!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create link';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (link: GroupInviteLink) => {
    try {
      await navigator.clipboard.writeText(link.inviteUrl);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = link.inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  const handleDeactivateLink = async (linkId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this invite link? It will no longer work.')) {
      return;
    }

    try {
      await groupInviteApi.deactivateInviteLink(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
      setSuccess('Link deactivated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to deactivate link';
      setError(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="invite-links-manager">
      <div className="links-header">
        <h3>Invite Links</h3>
        <button
          className="create-link-btn"
          onClick={handleCreateLink}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : '+ Create Link'}
        </button>
      </div>

      {error && <div className="links-error">{error}</div>}
      {success && <div className="links-success">{success}</div>}

      {isLoading ? (
        <div className="links-loading">Loading invite links...</div>
      ) : links.length === 0 ? (
        <div className="links-empty">
          <p>No invite links yet.</p>
          <p className="links-empty-hint">
            Create a link to share with anyone you want to invite to {groupName}.
          </p>
        </div>
      ) : (
        <div className="links-list">
          {links.map((link) => (
            <div key={link.id} className="link-card">
              <div className="link-info">
                <div className="link-url">{link.inviteUrl}</div>
                <div className="link-meta">
                  <span className="link-uses">{link.useCount} uses</span>
                  <span className="link-separator">•</span>
                  <span className="link-created">Created {formatDate(link.createdAt)}</span>
                  {link.createdByName && (
                    <>
                      <span className="link-separator">•</span>
                      <span className="link-creator">by {link.createdByName}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="link-actions">
                <button
                  className={`copy-btn ${copiedLinkId === link.id ? 'copied' : ''}`}
                  onClick={() => handleCopyLink(link)}
                >
                  {copiedLinkId === link.id ? 'Copied!' : 'Copy'}
                </button>
                <button
                  className="deactivate-btn"
                  onClick={() => handleDeactivateLink(link.id)}
                  title="Deactivate link"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupInviteLinksManager;
