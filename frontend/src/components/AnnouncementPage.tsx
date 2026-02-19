import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Announcement } from '../types/Announcement';
import { announcementAPI } from '../services/announcementApi';
import AnnouncementList from './AnnouncementList';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementDetail from './AnnouncementDetail';
import './AnnouncementPage.css';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

const AnnouncementPage: React.FC = () => {
  const { user } = useAuth();
  const { primaryMembership, allMemberships } = useOrganization();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingEditAnnouncement, setIsLoadingEditAnnouncement] = useState(false);

  // Check if user has a primary organization (required to create announcements)
  const hasPrimaryOrg = primaryMembership !== null;
  
  // Check admin roles for edit/delete permissions
  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const orgAdminOrganizationIds = new Set(
    allMemberships
      .filter((membership) => membership.role === 'ORG_ADMIN')
      .map((membership) => membership.organizationId)
  );
  
  // PLATFORM_ADMIN can create system-wide announcements without primary org
  // Regular users need a primary organization to create announcements
  const canCreateAnnouncements = (hasPrimaryOrg || isPlatformAdmin) && !!user;

  useEffect(() => {
    // Handle URL parameters
    const announcementId = searchParams.get('id');
    const mode = searchParams.get('mode') as ViewMode;
    console.log('[AnnouncementDebug] View mode sync', {
      mode,
      announcementId,
      hasSelectedAnnouncement: !!selectedAnnouncement,
      selectedAnnouncementId: selectedAnnouncement?.id
    });
    
    if (announcementId && mode === 'detail') {
      setViewMode('detail');
      // The detail component will load the announcement
    } else if (mode === 'create' && canCreateAnnouncements) {
      setViewMode('create');
    } else if (mode === 'edit' && (selectedAnnouncement || announcementId)) {
      setViewMode('edit');
    } else {
      setViewMode('list');
      // Keep URL unchanged here to avoid accidental navigation loops.
    }
  }, [searchParams, canCreateAnnouncements, selectedAnnouncement]);

  useEffect(() => {
    const loadAnnouncementForEdit = async () => {
      const mode = searchParams.get('mode');
      const announcementId = searchParams.get('id');

      if (mode !== 'edit' || !announcementId) {
        setIsLoadingEditAnnouncement(false);
        return;
      }

      if (selectedAnnouncement?.id === announcementId) {
        setIsLoadingEditAnnouncement(false);
        console.log('[AnnouncementDebug] Edit announcement already loaded', {
          announcementId
        });
        return;
      }

      try {
        setIsLoadingEditAnnouncement(true);
        console.log('[AnnouncementDebug] Loading announcement for edit', {
          announcementId
        });
        const response = await announcementAPI.getAnnouncement(announcementId);
        console.log('[AnnouncementDebug] Loaded announcement for edit', {
          announcementId: response.data?.id,
          organizationId: response.data?.organizationId
        });
        setSelectedAnnouncement(response.data);
      } catch (err: any) {
        console.error('[AnnouncementDebug] Failed loading announcement for edit', {
          announcementId,
          status: err?.response?.status,
          apiError: err?.response?.data?.error,
          message: err?.message
        });
        setError(err.response?.data?.error || 'Failed to load announcement for editing');
      } finally {
        setIsLoadingEditAnnouncement(false);
      }
    };

    loadAnnouncementForEdit();
  }, [searchParams, selectedAnnouncement]);

  const handleCreateNew = () => {
    if (!hasPrimaryOrg && !isPlatformAdmin) {
      setError('You must have a primary organization to create announcements. Please join a church first.');
      return;
    }
    
    setSelectedAnnouncement(null);
    setViewMode('create');
    setSearchParams({ mode: 'create' });
  };

  const handleEdit = (announcement: Announcement) => {
    // Allow edit if user is creator, platform admin, moderator, or ORG_ADMIN of this announcement's org
    const isOrgAdminForAnnouncement = !!announcement.organizationId && orgAdminOrganizationIds.has(announcement.organizationId);
    const canEdit = isPlatformAdmin || isModerator || isOrgAdminForAnnouncement || announcement.userId === user?.userId;
    
    if (!canEdit) {
      console.warn('[AnnouncementDebug] Edit denied by frontend permission check', {
        announcementId: announcement.id,
        userId: user?.userId,
        announcementOwnerId: announcement.userId,
        announcementOrganizationId: announcement.organizationId,
        isPlatformAdmin,
        isModerator,
        isOrgAdminForAnnouncement
      });
      setError('You do not have permission to edit this announcement');
      return;
    }
    
    console.log('[AnnouncementDebug] Entering edit mode', {
      announcementId: announcement.id,
      organizationId: announcement.organizationId
    });
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
              {canCreateAnnouncements && (
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
        if (selectedAnnouncement) {
          return (
            <AnnouncementForm
              mode="edit"
              existingAnnouncement={selectedAnnouncement}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          );
        }

        if (searchParams.get('id')) {
          return (
            <div className="announcement-list-loading">
              <div className="loading-spinner"></div>
              <p>
                {isLoadingEditAnnouncement
                  ? 'Loading announcement for editing...'
                  : 'Preparing editor...'}
              </p>
            </div>
          );
        }

        return (
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