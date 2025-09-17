import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Resource } from '../types/Resource';
import ResourceList from './ResourceList';
import ResourceForm from './ResourceForm';
import ResourceFileUploadForm from './ResourceFileUploadForm';
import ResourceDetail from './ResourceDetail';
import ResourceAdminPanel from './ResourceAdminPanel';
import './ResourcePage.css';

type ViewMode = 'list' | 'create' | 'create-file' | 'edit' | 'detail' | 'admin';

const ResourcePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';
  const canManageResources = isAdmin || isModerator;


  // Initialize view mode from URL on first load only
  useEffect(() => {
    const resourceId = searchParams.get('id');
    const mode = searchParams.get('mode') as ViewMode;
    
    console.log('🔄 Initial useEffect - URL params:', { resourceId, mode, currentViewMode: viewMode });
    
    // Only set initial state if we're starting fresh (viewMode is 'list')
    if (viewMode === 'list') {
      if (resourceId && mode === 'detail') {
        console.log('✅ Initial load: Setting viewMode to detail from URL');
        setViewMode('detail');
      } else if (mode === 'create' && user) {
        console.log('✅ Initial load: Setting viewMode to create from URL');
        setViewMode('create');
      } else if (mode === 'create-file' && user) {
        console.log('✅ Initial load: Setting viewMode to create-file from URL');
        setViewMode('create-file');
      } else if (mode === 'admin' && canManageResources) {
        console.log('✅ Initial load: Setting viewMode to admin from URL');
        setViewMode('admin');
      } else if (mode === 'edit' && selectedResource) {
        console.log('✅ Initial load: Setting viewMode to edit from URL');
        setViewMode('edit');
      }
    }
  }, []); // Only run on initial mount

  const handleCreateNew = () => {
    if (!user) {
      setError('You must be logged in to create resources');
      return;
    }
    
    setSelectedResource(null);
    setViewMode('create');
    setSearchParams({ mode: 'create' });
    setError(null);
  };

  const handleCreateWithFile = () => {
    if (!user) {
      setError('You must be logged in to create resources');
      return;
    }
    
    setSelectedResource(null);
    setViewMode('create-file');
    setSearchParams({ mode: 'create-file' });
    setError(null);
  };

  const handleShowAdmin = () => {
    if (!canManageResources) {
      setError('You do not have permission to access admin features');
      return;
    }
    
    setViewMode('admin');
    setSearchParams({ mode: 'admin' });
    setError(null);
  };

  const handleEditResource = (resource: Resource) => {
    if (!user) {
      setError('You must be logged in to edit resources');
      return;
    }

    if (resource.uploadedById !== user.userId && !canManageResources) {
      setError('You can only edit your own resources');
      return;
    }
    
    setSelectedResource(resource);
    setViewMode('edit');
    setSearchParams({ mode: 'edit', id: resource.id });
    setError(null);
  };

  const handleViewResource = (resource: Resource) => {
    console.log('🖱️ handleViewResource called with:', {
      resourceId: resource.id,
      resourceTitle: resource.title,
      resourceType: resource.fileType,
      isYouTube: !!(resource.youtubeVideoId || resource.fileType === 'video/youtube')
    });
    
    setSelectedResource(resource);
    setViewMode('detail');
    setSearchParams({ mode: 'detail', id: resource.id });
    setError(null);
    
    console.log('✅ View mode changed to detail, URL updated');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedResource(null);
    setSearchParams({});
    setError(null);
  };

  const handleResourceCreated = (resource: Resource) => {
    console.log('Resource created:', resource);
    setError(null);
    handleBackToList();
  };

  const handleResourceUpdated = (resource: Resource) => {
    console.log('Resource updated:', resource);
    setSelectedResource(resource);
    setError(null);
    handleBackToList();
  };

  const handleResourceDeleted = (resourceId: string) => {
    console.log('Resource deleted:', resourceId);
    setError(null);
    handleBackToList();
  };

  const renderViewMode = () => {
    console.log('🎨 renderViewMode called with viewMode:', viewMode);
    
    switch (viewMode) {
      case 'create':
        return (
          <ResourceForm
            onSuccess={handleResourceCreated}
            onCancel={handleBackToList}
            onError={setError}
          />
        );

      case 'create-file':
        return (
          <ResourceFileUploadForm
            onSuccess={handleResourceCreated}
            onCancel={handleBackToList}
            onError={setError}
          />
        );

      case 'edit':
        if (!selectedResource) {
          return <div>No resource selected for editing</div>;
        }
        return (
          <ResourceForm
            resource={selectedResource}
            onSuccess={handleResourceUpdated}
            onCancel={handleBackToList}
            onError={setError}
          />
        );

      case 'detail':
        // Use selectedResource instead of searchParams for reliability
        const resourceId = selectedResource?.id || searchParams.get('id');
        console.log('🔍 Detail case - resourceId:', resourceId, 'selectedResource:', !!selectedResource);
        if (!resourceId) {
          console.log('❌ No resource ID available');
          return <div>No resource ID provided</div>;
        }
        console.log('✅ Rendering ResourceDetail with resourceId:', resourceId);
        return (
          <ResourceDetail
            resourceId={resourceId}
            onEdit={handleEditResource}
            onDelete={handleResourceDeleted}
            onBack={handleBackToList}
            onError={setError}
          />
        );

      case 'admin':
        return (
          <ResourceAdminPanel
            onBack={handleBackToList}
            onError={setError}
          />
        );

      default:
        return (
          <ResourceList
            onCreateNew={handleCreateNew}
            onCreateWithFile={handleCreateWithFile}
            onEditResource={handleEditResource}
            onViewResource={handleViewResource}
            onShowAdmin={canManageResources ? handleShowAdmin : undefined}
            onError={setError}
          />
        );
    }
  };

  return (
    <div className="resource-page">
      <header className="resource-page-header">
        <div className="resource-page-title">
          <h1>📚 Resources & Library</h1>
          <p>Access studies, devotionals, documents and more</p>
        </div>
        
        {/* Navigation */}
        <div className="resource-navigation">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="back-home-button"
          >
            🏠 Back Home
          </button>
        </div>

        {viewMode === 'list' && user && (
          <div className="resource-page-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCreateNew}
              title="Add text resource or YouTube video"
            >
              📝 Add Text/YouTube
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateWithFile}
              title="Upload a file"
            >
              📁 Upload File
            </button>
            {canManageResources && (
              <button
                className="btn btn-outline-primary"
                onClick={handleShowAdmin}
              >
                🛡️ Admin
              </button>
            )}
          </div>
        )}

        {viewMode !== 'list' && (
          <div className="resource-page-actions">
            <button
              className="btn btn-secondary"
              onClick={handleBackToList}
            >
              ⬅️ Back to Resources
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <main className="resource-page-content">
        {renderViewMode()}
      </main>
    </div>
  );
};

export default ResourcePage;