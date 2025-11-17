import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getFollowing } from '../services/postApi';
import { UserProfile } from '../types/Profile';
import ClickableAvatar from './ClickableAvatar';
import { useNavigate } from 'react-router-dom';
import './FollowingList.css';

interface FollowingListProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

const FollowingList: React.FC<FollowingListProps> = ({
  userId,
  userName,
  isOpen,
  onClose
}) => {
  const [following, setFollowing] = useState<UserProfile[]>([]);
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
    node.setAttribute('data-following-modal-root', 'true');
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
      loadFollowing(true);
    } else {
      setFollowing([]);
      setPage(0);
      setHasMore(true);
      setError(null);
    }
  }, [isOpen, userId]);

  const loadFollowing = async (reset: boolean = false) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      const currentPage = reset ? 0 : page;
      const response = await getFollowing(userId, currentPage, 20);

      if (reset) {
        setFollowing(response.content || []);
        setPage(1);
      } else {
        setFollowing(prev => [...prev, ...(response.content || [])]);
        setPage(prev => prev + 1);
      }

      setHasMore((response.content?.length || 0) === 20);
    } catch (err: any) {
      console.error('Error loading following:', err);
      setError(err.response?.data?.error || 'Failed to load following');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadFollowing(false);
    }
  };

  const handleUserClick = (followingUserId: string) => {
    onClose();
    navigate(`/profile/${followingUserId}`);
  };

  if (!isOpen || !modalRootRef.current) {
    return null;
  }

  return createPortal(
    <div className="following-list-overlay" onClick={onClose}>
      <div className="following-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="following-list-header">
          <h2>Following</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="following-list-content">
          {loading && following.length === 0 ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading following...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>⚠️ {error}</p>
              <button onClick={() => loadFollowing(true)} className="retry-button">
                Retry
              </button>
            </div>
          ) : following.length === 0 ? (
            <div className="empty-state">
              <p>👥 Not following anyone yet</p>
              <p className="empty-subtext">When {userName} follows people, they'll appear here.</p>
            </div>
          ) : (
            <>
              <div className="following-list">
                {following.map((user) => (
                  <div
                    key={user.userId}
                    className="following-item"
                    onClick={() => handleUserClick(user.userId)}
                  >
                    <ClickableAvatar
                      userId={user.userId}
                      profilePicUrl={user.profilePicUrl}
                      userName={user.name}
                      size="medium"
                    />
                    <div className="following-info">
                      <div className="following-name">{user.name}</div>
                      {user.bio && (
                        <div className="following-bio">{user.bio}</div>
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

export default FollowingList;

