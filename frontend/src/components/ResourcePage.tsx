import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Resource } from '../types/Resource';
import ResourceList from './ResourceList';
import ResourceForm from './ResourceForm';
import ResourceDetail from './ResourceDetail';
import './ResourcePage.css';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

const ResourcePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    } else if (mode === 'edit' && selectedResource) {
      setViewMode('edit');
    } else {
      setViewMode('list');
      setSearchParams({}); // Clear any invalid params
    }
  }, [searchParams, user, selectedResource, setSearchParams]);

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

  const handleEditResource = (resource: Resource) => {
    if (!user) {
      setError('You must be logged in to edit resources');
      return;
    }

    if (resource.uploadedById !== user.id && !canManageResources) {
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

      default:
        return (
          <ResourceList
            onCreateNew={handleCreateNew}
            onEditResource={handleEditResource}
            onViewResource={handleViewResource}
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

        {viewMode === 'list' && user && (
          <div className="resource-page-actions">
            <button
              className="btn btn-primary"
              onClick={handleCreateNew}
            >
              ➕ Add Resource
            </button>
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