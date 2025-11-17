import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFollowers } from '../services/postApi';
import { UserProfile } from '../types/Profile';
import ClickableAvatar from './ClickableAvatar';
import { useNavigate } from 'react-router-dom';
import './FollowersList.css';

interface FollowersListProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const FollowersList: React.FC<FollowersListProps> = ({
  userId,
  userName,
  isOpen,
  onClose
}) => {
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const modalRootRef = React.useRef<HTMLDivElement | null>(null);
  const previousBodyOverflow = React.useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const node = document.createElement('div');
    node.setAttribute('data-followers-modal-root', 'true');
    modalRootRef.current = node;
    document.body.appendChild(node);
    return () => {
      if (modalRootRef.current) {
        document.body.removeChild(modalRootRef.current);
        modalRootRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    if (!isOpen) {
      if (previousBodyOverflow.current !== null) {
        document.body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
      return;
    }
    const body = document.body;
    if (previousBodyOverflow.current === null) {
      previousBodyOverflow.current = body.style.overflow || '';
      body.style.overflow = 'hidden';
    }
    return () => {
      if (previousBodyOverflow.current !== null) {
        body.style.overflow = previousBodyOverflow.current;
        previousBodyOverflow.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && userId) {
      loadFollowers(true);
    } else {
      setFollowers([]);
      setPage(0);
      setHasMore(true);
      setError(null);
    }
  }, [isOpen, userId]);

  const loadFollowers = async (reset: boolean = false) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 0 : page;
      const response = await getFollowers(userId, currentPage, 20);

      if (reset) {
        setFollowers(response.content || []);
        setPage(1);
      } else {
        setFollowers(prev => [...prev, ...(response.content || [])]);
        setPage(prev => prev + 1);
      }

      setHasMore((response.content?.length || 0) === 20);
    } catch (err: any) {
      console.error('Error loading followers:', err);
      setError(err.response?.data?.error || 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadFollowers(false);
    }
  };

  const handleUserClick = (followerUserId: string) => {
    onClose();
    navigate(`/profile/${followerUserId}`);
  };

  if (!isOpen || !modalRootRef.current) {
    return null;
  }

  return createPortal(
    <div className="followers-list-overlay" onClick={onClose}>
      <div className="followers-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="followers-list-header">
          <h2>Followers</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="followers-list-content">
          {loading && followers.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading followers...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button onClick={() => loadFollowers(true)} className="retry-button">
                Retry
              </button>
            </div>
          ) : followers.length === 0 ? (
            <div className="empty-state">
              <p>👥 No followers yet</p>
              <p className="empty-subtext">When people follow {userName}, they'll appear here.</p>
            </div>
          ) : (
            <>
              <div className="followers-list">
                {followers.map((follower) => (
                  <div
                    key={follower.userId}
                    className="follower-item"
                    onClick={() => handleUserClick(follower.userId)}
                  >
                    <ClickableAvatar
                      userId={follower.userId}
                      profilePicUrl={follower.profilePicUrl}
                      userName={follower.name}
                      size="medium"
                    />
                    <div className="follower-info">
                      <div className="follower-name">{follower.name}</div>
                      {follower.bio && (
                        <div className="follower-bio">{follower.bio}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="load-more-container">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="load-more-button"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    modalRootRef.current
  );
};

export default FollowersList;

