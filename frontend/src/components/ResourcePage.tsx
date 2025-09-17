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


  useEffect(() => {
    // Handle URL parameters
    const resourceId = searchParams.get('id');
    const mode = searchParams.get('mode') as ViewMode;
    
    if (resourceId && mode === 'detail') {
      setViewMode('detail');
      // The detail component will load the resource
    } else if (mode === 'create' && user) {
      setViewMode('create');
    } else if (mode === 'create-file' && user) {
      setViewMode('create-file');
    } else if (mode === 'admin' && canManageResources) {
      setViewMode('admin');
    } else if (mode === 'edit' && selectedResource) {
      setViewMode('edit');
    } else {
      setViewMode('list');
      setSearchParams({}); // Clear any invalid params
    }
  }, [searchParams, user, selectedResource, setSearchParams, canManageResources]);

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
    setSelectedResource(resource);
    setViewMode('detail');
    setSearchParams({ mode: 'detail', id: resource.id });
    setError(null);
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
        const resourceId = searchParams.get('id');
        if (!resourceId) {
          return <div>No resource ID provided</div>;
        }
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