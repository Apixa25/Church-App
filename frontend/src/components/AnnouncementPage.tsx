import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Announcement } from '../types/Announcement';
import AnnouncementList from './AnnouncementList';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementDetail from './AnnouncementDetail';
import './AnnouncementPage.css';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

const AnnouncementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.role === 'MODERATOR';
  const isModerator = user?.role === 'MODERATOR';
  const canManageAnnouncements = isAdmin || isModerator;

  useEffect(() => {
    // Handle URL parameters
    const announcementId = searchParams.get('id');
    const mode = searchParams.get('mode') as ViewMode;
    
    if (announcementId && mode === 'detail') {
      setViewMode('detail');
      // The detail component will load the announcement
    } else if (mode === 'create' && canManageAnnouncements) {
      setViewMode('create');
    } else if (mode === 'edit' && selectedAnnouncement) {
      setViewMode('edit');
    } else {
      setViewMode('list');
      setSearchParams({}); // Clear any invalid params
    }
  }, [searchParams, canManageAnnouncements, selectedAnnouncement, setSearchParams]);

  const handleCreateNew = () => {
    if (!canManageAnnouncements) {
      setError('You do not have permission to create announcements');
      return;
    }
    
    setSelectedAnnouncement(null);
    setViewMode('create');
    setSearchParams({ mode: 'create' });
  };

  const handleEdit = (announcement: Announcement) => {
    if (!canManageAnnouncements && announcement.userId !== user?.userId) {
      setError('You do not have permission to edit this announcement');
      return;
    }
    
    setSelectedAnnouncement(announcement);
    setViewMode('edit');
    setSearchParams({ mode: 'edit', id: announcement.id });
  };

  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setViewMode('detail');
    setSearchParams({ mode: 'detail', id: announcement.id });
  };

  const handleSuccess = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setViewMode('list');
    setSearchParams({});
    setError(null);
  };

  const handleCancel = () => {
    setSelectedAnnouncement(null);
    setViewMode('list');
    setSearchParams({});
    setError(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSearchParams({});
    setSelectedAnnouncement(null);
  };

  const renderHeader = () => {
    switch (viewMode) {
      case 'create':
        return (
          <div className="page-header">
            <button onClick={handleCancel} className="back-button">
              ← Back to Announcements
            </button>
          </div>
        );
      case 'edit':
        return (
          <div className="page-header">
            <button onClick={handleCancel} className="back-button">
              ← Back to Announcements
            </button>
          </div>
        );
      case 'detail':
        return (
          <div className="page-header">
            <button onClick={handleBackToList} className="back-button">
              ← Back to Announcements
            </button>
          </div>
        );
      default:
        return (
          <div className="page-header">
            <div className="header-top">
              <button 
                className="back-home-btn"
                onClick={() => navigate('/')}
                title="Back to Dashboard"
              >
                🏠 Back Home
              </button>
              <h1 className="page-title">📢 Church Announcements</h1>
              {canManageAnnouncements && (
                <button onClick={handleCreateNew} className="create-button">
                  ➕ New Announcement
                </button>
              )}
            </div>
            <div className="header-content">
              <p>Stay updated with the latest church news and events</p>
            </div>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <AnnouncementForm
            mode="create"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        );
      case 'edit':
        return selectedAnnouncement ? (
          <AnnouncementForm
            mode="edit"
            existingAnnouncement={selectedAnnouncement}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <div className="error-state">
            <p>No announcement selected for editing.</p>
            <button onClick={handleCancel} className="btn-secondary">
              Back to List
            </button>
          </div>
        );
      case 'detail':
        return searchParams.get('id') ? (
          <AnnouncementDetail
            announcementId={searchParams.get('id')!}
            onEdit={handleEdit}
            onBack={handleBackToList}
          />
        ) : (
          <div className="error-state">
            <p>No announcement ID provided.</p>
            <button onClick={handleBackToList} className="btn-secondary">
              Back to List
            </button>
          </div>
        );
      default:
        return (
          <AnnouncementList
            onEdit={handleEdit}
            onView={handleView}
            showActions={true}
            showFilters={true}
          />
        );
    }
  };

  return (
    <div className="announcement-page">
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="error-close"
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      {renderHeader()}
      
      <div className="page-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AnnouncementPage;