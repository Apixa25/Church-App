import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Announcement, AnnouncementCategory } from '../types/Announcement';
import { announcementAPI } from '../services/announcementApi';
import { safeParseDate } from '../utils/dateUtils';
import ClickableAvatar from './ClickableAvatar';
import './AnnouncementList.css';

interface AnnouncementListProps {
  onEdit?: (announcement: Announcement) => void;
  onView?: (announcement: Announcement) => void;
  showActions?: boolean;
  limit?: number;
  showFilters?: boolean;
}

const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  GENERAL: 'General',
  WORSHIP: 'Worship',
  EVENTS: 'Events',
  MINISTRY: 'Ministry',
  YOUTH: 'Youth',
  MISSIONS: 'Missions',
  PRAYER: 'Prayer',
  COMMUNITY: 'Community',
  URGENT: 'Urgent',
  CELEBRATION: 'Celebration'
};

const AnnouncementList: React.FC<AnnouncementListProps> = ({
  onEdit,
  onView,
  showActions = true,
  limit,
  showFilters = true
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pinnedAnnouncements, setPinnedAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Use refs to track values without causing re-renders
  const pageRef = useRef(0);
  const searchTextRef = useRef('');

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | ''>('');
  const [searchText, setSearchText] = useState('');

  const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR';
  const isModerator = user?.role === 'MODERATOR';
  const canManageAnnouncements = isAdmin || isModerator;

  const loadPinnedAnnouncements = useCallback(async () => {
    try {
      const response = await announcementAPI.getPinnedAnnouncements();
      setPinnedAnnouncements(response.data);
    } catch (err) {
      console.error('Error loading pinned announcements:', err);
    }
  }, []);

  const loadAnnouncements = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(0);
        pageRef.current = 0;
      } else {
        setIsLoadingMore(true);
      }

      // Use ref values to avoid dependency issues
      const currentPage = reset ? 0 : pageRef.current;
      const size = limit || 10;
      const currentSearchText = searchTextRef.current.trim();

      let response;
      if (currentSearchText) {
        response = await announcementAPI.searchAnnouncements(currentSearchText, currentPage, size);
      } else if (selectedCategory) {
        response = await announcementAPI.getAnnouncementsByCategory(selectedCategory, currentPage, size);
      } else {
        response = await announcementAPI.getAllAnnouncements(currentPage, size);
      }

      const newAnnouncements = response.data.content;
      
      if (reset) {
        setAnnouncements(newAnnouncements);
      } else {
        setAnnouncements(prev => [...prev, ...newAnnouncements]);
      }

      setHasMore(!response.data.last);
      const nextPage = currentPage + 1;
      setPage(nextPage);
      pageRef.current = nextPage;
      setError(null);
    } catch (err: any) {
      console.error('Error loading announcements:', err);
      setError(err.response?.data?.error || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [limit, selectedCategory]);

  useEffect(() => {
    loadAnnouncements(true);
    loadPinnedAnnouncements();
  }, [loadAnnouncements, loadPinnedAnnouncements]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update ref with current search text before loading
    searchTextRef.current = searchText;
    loadAnnouncements(true);
  };

  const handleCategoryFilter = (category: AnnouncementCategory | '') => {
    setSelectedCategory(category);
    setPage(0);
    pageRef.current = 0;
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      loadAnnouncements(false);
    }
  };

  const handlePin = async (announcementId: string) => {
    if (!isAdmin) return;

    try {
      await announcementAPI.pinAnnouncement(announcementId);
      loadAnnouncements(true);
      loadPinnedAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to pin announcement');
    }
  };

  const handleUnpin = async (announcementId: string) => {
    if (!isAdmin) return;

    try {
      await announcementAPI.unpinAnnouncement(announcementId);
      loadAnnouncements(true);
      loadPinnedAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unpin announcement');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await announcementAPI.deleteAnnouncement(announcementId);
      loadAnnouncements(true);
      loadPinnedAnnouncements();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete announcement');
    }
  };

  const handleView = (announcement: Announcement) => {
    if (onView) {
      onView(announcement);
    } else {
      navigate(`/announcements/${announcement.id}`);
    }
  };

  const formatDate = (timestamp: any) => {
    const date = safeParseDate(timestamp);
    if (!date) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category: AnnouncementCategory) => {
    const colors: Record<AnnouncementCategory, string> = {
      GENERAL: '#6B7280',
      WORSHIP: '#8B5CF6',
      EVENTS: '#10B981',
      MINISTRY: '#3B82F6',
      YOUTH: '#F59E0B',
      MISSIONS: '#EF4444',
      PRAYER: '#EC4899',
      COMMUNITY: '#06B6D4',
      URGENT: '#DC2626',
      CELEBRATION: '#84CC16'
    };
    return colors[category] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="announcement-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="announcement-list">
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => loadAnnouncements(true)}>Try Again</button>
        </div>
      )}

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="pinned-announcements">
          <h3>📌 Pinned Announcements</h3>
          {pinnedAnnouncements.map(announcement => (
            <div key={announcement.id} className="announcement-card pinned">
              <div className="announcement-header">
                <div className="announcement-author">
                  <ClickableAvatar
                    userId={announcement.userId}
                    profilePicUrl={announcement.userProfilePicUrl}
                    userName={announcement.userName}
                    size="medium"
                  />
                  <div className="author-info">
                    <span className="author-name">{announcement.userName}</span>
                    <span className="author-role">{announcement.userRole}</span>
                    <span className="announcement-date">{formatDate(announcement.createdAt)}</span>
                  </div>
                </div>
                <div className="announcement-actions">
                  <span 
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(announcement.category) }}
                  >
                    {CATEGORY_LABELS[announcement.category]}
                  </span>
                  {isAdmin && showActions && (
                    <>
                      <button 
                        onClick={() => handleUnpin(announcement.id)}
                        className="btn-icon unpin"
                        title="Unpin"
                      >
                        📌
                      </button>
                      <button 
                        onClick={() => onEdit?.(announcement)}
                        className="btn-icon edit"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(announcement.id)}
                        className="btn-icon delete"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="announcement-content">
                <h4 className="announcement-title" onClick={() => handleView(announcement)}>
                  {announcement.title}
                </h4>
                <p className="announcement-text">{announcement.content}</p>
                {announcement.imageUrl && (
                  <img 
                    src={announcement.imageUrl} 
                    alt="Announcement" 
                    className="announcement-image"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="announcement-filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                searchTextRef.current = e.target.value;
              }}
              className="search-input"
            />
            <button type="submit" className="search-btn">🔍</button>
          </form>

          <div className="category-filters">
            <button
              className={`filter-btn ${selectedCategory === '' ? 'active' : ''}`}
              onClick={() => handleCategoryFilter('')}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([category, label]) => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryFilter(category as AnnouncementCategory)}
                style={{ 
                  borderColor: selectedCategory === category ? getCategoryColor(category as AnnouncementCategory) : undefined 
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Regular Announcements */}
      <div className="announcements-feed">
        {announcements.length === 0 ? (
          <div className="no-announcements">
            <p>No announcements found.</p>
            {canManageAnnouncements && (
              <button 
                onClick={() => navigate('/announcements/create')}
                className="btn-primary"
              >
                Create First Announcement
              </button>
            )}
          </div>
        ) : (
          announcements.map(announcement => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-header">
                <div className="announcement-author">
                  <ClickableAvatar
                    userId={announcement.userId}
                    profilePicUrl={announcement.userProfilePicUrl}
                    userName={announcement.userName}
                    size="medium"
                  />
                  <div className="author-info">
                    <span className="author-name">{announcement.userName}</span>
                    <span className="author-role">{announcement.userRole}</span>
                    <span className="announcement-date">{formatDate(announcement.createdAt)}</span>
                  </div>
                </div>
                <div className="announcement-actions">
                  <span 
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(announcement.category) }}
                  >
                    {CATEGORY_LABELS[announcement.category]}
                  </span>
                  {showActions && (
                    <>
                      {isAdmin && !announcement.isPinned && (
                        <button 
                          onClick={() => handlePin(announcement.id)}
                          className="btn-icon pin"
                          title="Pin"
                        >
                          📌
                        </button>
                      )}
                      {(isAdmin || announcement.userId === user?.userId) && (
                        <>
                          <button 
                            onClick={() => onEdit?.(announcement)}
                            className="btn-icon edit"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDelete(announcement.id)}
                            className="btn-icon delete"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="announcement-content">
                <h4 className="announcement-title" onClick={() => handleView(announcement)}>
                  {announcement.title}
                </h4>
                <p className="announcement-text">{announcement.content}</p>
                {announcement.imageUrl && (
                  <img 
                    src={announcement.imageUrl} 
                    alt="Announcement" 
                    className="announcement-image"
                  />
                )}
              </div>
            </div>
          ))
        )}

        {/* Load More */}
        {hasMore && !limit && (
          <div className="load-more">
            <button 
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="btn-secondary"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementList;