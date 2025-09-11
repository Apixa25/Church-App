import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Announcement, AnnouncementCategory } from '../types/Announcement';
import { announcementAPI } from '../services/announcementApi';
import './AnnouncementDetail.css';

interface AnnouncementDetailProps {
  announcementId: string;
  onEdit?: (announcement: Announcement) => void;
  onBack?: () => void;
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

const AnnouncementDetail: React.FC<AnnouncementDetailProps> = ({
  announcementId,
  onEdit,
  onBack
}) => {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const canEdit = isAdmin || announcement?.userId === user?.userId;

  const loadAnnouncement = useCallback(async () => {
    try {
      setLoading(true);
      const response = await announcementAPI.getAnnouncement(announcementId);
      setAnnouncement(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading announcement:', err);
      setError(err.response?.data?.error || 'Failed to load announcement');
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    loadAnnouncement();
  }, [loadAnnouncement]);

  const handleEdit = () => {
    if (announcement && onEdit) {
      onEdit(announcement);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
      <div className="announcement-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading announcement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="announcement-detail-error">
        <div className="error-content">
          <span className="error-icon">⚠️</span>
          <h3>Failed to Load Announcement</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={loadAnnouncement} className="btn-primary">
              Try Again
            </button>
            {onBack && (
              <button onClick={onBack} className="btn-secondary">
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="announcement-detail-error">
        <div className="error-content">
          <span className="error-icon">📭</span>
          <h3>Announcement Not Found</h3>
          <p>The announcement you're looking for doesn't exist or may have been deleted.</p>
          {onBack && (
            <button onClick={onBack} className="btn-secondary">
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="announcement-detail">
      <article className="announcement-content">
        {/* Header */}
        <header className="announcement-header">
          <div className="announcement-meta">
            <div className="author-info">
              {announcement.userProfilePicUrl && (
                <img 
                  src={announcement.userProfilePicUrl} 
                  alt={announcement.userName} 
                  className="author-avatar"
                />
              )}
              <div className="author-details">
                <h4 className="author-name">{announcement.userName}</h4>
                <span className="author-role">{announcement.userRole}</span>
                <time className="publication-date">
                  {formatDate(announcement.createdAt)}
                </time>
                {announcement.updatedAt !== announcement.createdAt && (
                  <time className="updated-date">
                    Updated: {formatDate(announcement.updatedAt)}
                  </time>
                )}
              </div>
            </div>
            
            <div className="announcement-badges">
              {announcement.isPinned && (
                <span className="pinned-badge">📌 Pinned</span>
              )}
              <span 
                className="category-badge"
                style={{ backgroundColor: getCategoryColor(announcement.category) }}
              >
                {CATEGORY_LABELS[announcement.category]}
              </span>
            </div>
          </div>

          {canEdit && (
            <div className="announcement-actions">
              <button onClick={handleEdit} className="edit-button">
                ✏️ Edit
              </button>
            </div>
          )}
        </header>

        {/* Title */}
        <h1 className="announcement-title">{announcement.title}</h1>

        {/* Image */}
        {announcement.imageUrl && (
          <div className="announcement-image-container">
            <img 
              src={announcement.imageUrl} 
              alt="" 
              className="announcement-image"
            />
          </div>
        )}

        {/* Content */}
        <div className="announcement-body">
          <p className="announcement-text">{announcement.content}</p>
        </div>

        {/* Footer */}
        <footer className="announcement-footer">
          <div className="announcement-stats">
            <span className="stat-item">
              📅 Posted {formatDate(announcement.createdAt)}
            </span>
            {announcement.updatedAt !== announcement.createdAt && (
              <span className="stat-item">
                ✏️ Last updated {formatDate(announcement.updatedAt)}
              </span>
            )}
          </div>
        </footer>
      </article>
    </div>
  );
};

export default AnnouncementDetail;