import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resourceAPI } from '../services/resourceApi';
import { 
  Resource, 
  ResourceCategory, 
  getResourceCategoryLabel, 
  formatFileSize, 
  getFileIconByType,
  isYouTubeResource
} from '../types/Resource';
import './ResourceList.css';

interface ResourceListProps {
  onCreateNew: () => void;
  onCreateWithFile: () => void;
  onEditResource: (resource: Resource) => void;
  onViewResource: (resource: Resource) => void;
  onShowAdmin?: () => void;
  onError: (error: string) => void;
}

const ResourceList: React.FC<ResourceListProps> = ({
  onCreateNew,
  onCreateWithFile,
  onEditResource,
  onViewResource,
  onShowAdmin,
  onError,
}) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'my-resources'>('all');
  const [approvalFilter, setApprovalFilter] = useState<boolean | undefined>(undefined);

  const pageSize = 12;
  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';


  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      
      let response;
      if (viewMode === 'my-resources' && user) {
        response = await resourceAPI.getUserResources(currentPage, pageSize, approvalFilter);
      } else {
        response = await resourceAPI.getApprovedResources(
          currentPage,
          pageSize,
          selectedCategory || undefined,
          searchTerm || undefined
        );
      }

      console.log('Raw API response:', response.data);
      console.log('First resource createdAt:', response.data.resources[0]?.createdAt);
      setResources(response.data.resources);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (error: any) {
      console.error('Error loading resources:', error);
      onError(error.response?.data?.error || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedCategory, viewMode, approvalFilter, user, onError]);

  useEffect(() => {
    loadResources();
  }, [currentPage, searchTerm, selectedCategory, viewMode, approvalFilter, loadResources]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    loadResources();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(0);
  };

  const handleViewModeChange = (mode: 'all' | 'my-resources') => {
    setViewMode(mode);
    setCurrentPage(0);
    setApprovalFilter(undefined);
  };

  const handleApprovalFilterChange = (approved?: boolean) => {
    setApprovalFilter(approved);
    setCurrentPage(0);
  };

  const handleDownload = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!resource.fileUrl) {
      onError('No file available for download');
      return;
    }

    try {
      // Track the download
      await resourceAPI.trackDownload(resource.id);
      
      // Open file in new tab for download
      window.open(resource.fileUrl, '_blank');
    } catch (error: any) {
      console.error('Error tracking download:', error);
      // Still allow download even if tracking fails
      window.open(resource.fileUrl, '_blank');
    }
  };

  const handleDeleteResource = async (resource: Resource) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${resource.title}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await resourceAPI.deleteResource(resource.id);
      // Refresh the resource list
      loadResources();
      console.log('Resource deleted successfully:', resource.id);
    } catch (error: any) {
      console.error('Delete failed:', error);
      onError(error.response?.data?.error || 'Failed to delete resource');
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) {
      console.warn('formatDate: No date input provided');
      return 'Unknown Date';
    }
    
    console.log('formatDate input:', dateInput, 'type:', typeof dateInput, 'isArray:', Array.isArray(dateInput));
    
    let date: Date;
    
    // Handle LocalDateTime array format: [year, month, day, hour, minute, second, nanoseconds]
    if (Array.isArray(dateInput) && dateInput.length >= 6) {
      // Convert array to Date (month is 0-indexed in JavaScript)
      const [year, month, day, hour, minute, second] = dateInput;
      date = new Date(year, month - 1, day, hour, minute, second);
      console.log('Parsed from array:', date, 'isValid:', !isNaN(date.getTime()));
    } else if (typeof dateInput === 'string') {
      // Handle string dates
      date = new Date(dateInput);
      
      // If that fails, try parsing as ISO string without timezone
      if (isNaN(date.getTime()) && dateInput.includes('T')) {
        const withoutTimezone = dateInput.split(/[+-]\d{2}:\d{2}$/)[0];
        date = new Date(withoutTimezone);
      }
      
      // If still fails, try parsing just the date part
      if (isNaN(date.getTime()) && dateInput.includes('T')) {
        const datePart = dateInput.split('T')[0];
        date = new Date(datePart);
      }
      
      console.log('Parsed from string:', date, 'isValid:', !isNaN(date.getTime()));
    } else {
      console.error('Unsupported date format:', dateInput);
      return 'Invalid Date';
    }
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateInput);
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const canEditResource = (resource: Resource) => {
    if (!user) return false;
    return resource.uploadedById === user.userId || isAdmin || isModerator;
  };

  const renderResourceCard = (resource: Resource) => (
    <div 
      key={resource.id} 
      className="resource-card" 
      onClick={() => {
        console.log('🖱️ Resource card clicked:', {
          resourceId: resource.id,
          resourceTitle: resource.title,
          hasOnViewResource: !!onViewResource
        });
        onViewResource(resource);
      }}
    >
      {/* YouTube Thumbnail */}
      {isYouTubeResource(resource) && resource.youtubeThumbnailUrl && (
        <div className="resource-youtube-thumbnail">
          <img 
            src={resource.youtubeThumbnailUrl} 
            alt="YouTube video thumbnail"
            className="youtube-thumbnail-img"
          />
          <div className="youtube-play-overlay">
            <div className="youtube-play-button">▶️</div>
          </div>
          <div className="youtube-video-badge">🎥 VIDEO</div>
        </div>
      )}
      
      <div className="resource-card-header">
        <div className="resource-icon">
          {getFileIconByType(resource.fileType)}
        </div>
        <div className="resource-meta">
          <span className="resource-category">
            {getResourceCategoryLabel(resource.category)}
          </span>
          {viewMode === 'my-resources' && (
            <span className={`approval-status ${resource.isApproved ? 'approved' : 'pending'}`}>
              {resource.isApproved ? '✅ Approved' : '⏳ Pending'}
            </span>
          )}
        </div>
      </div>

      <div className="resource-content">
        <h3 className="resource-title">{resource.title}</h3>
        {resource.description && (
          <p className="resource-description">
            {resource.description.length > 120
              ? `${resource.description.substring(0, 120)}...`
              : resource.description}
          </p>
        )}
      </div>

      <div className="resource-footer">
        <div className="resource-info">
          <div className="uploader-info">
            <img
              src={resource.uploaderProfilePicUrl || '/default-avatar.png'}
              alt={resource.uploaderName}
              className="uploader-avatar"
            />
            <span className="uploader-name">{resource.uploaderName}</span>
          </div>
          <div className="resource-stats">
            <span className="upload-date">{formatDate(resource.createdAt)}</span>
            {resource.fileSize && (
              <span className="file-size">{formatFileSize(resource.fileSize)}</span>
            )}
            <span className="download-count">↓ {resource.downloadCount}</span>
          </div>
        </div>

        <div className="resource-actions" onClick={(e) => e.stopPropagation()}>
          {resource.fileUrl && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={(e) => handleDownload(resource, e)}
              title="Download file"
            >
              ⬇️
            </button>
          )}
          {canEditResource(resource) && (
            <>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditResource(resource);
                }}
                title="Edit resource"
              >
                ✏️
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteResource(resource);
                }}
                title="Delete resource"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="resource-list">
      {/* Search and Filter Bar */}
      <div className="resource-list-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">🔍</button>
        </form>

        <div className="filter-controls">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {Object.values(ResourceCategory).map((category) => (
              <option key={category} value={category}>
                {getResourceCategoryLabel(category)}
              </option>
            ))}
          </select>

          {user && (
            <div className="view-mode-toggle">
              <button
                className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('all')}
              >
                All Resources
              </button>
              <button
                className={`toggle-btn ${viewMode === 'my-resources' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('my-resources')}
              >
                My Resources
              </button>
            </div>
          )}

          {viewMode === 'my-resources' && (
            <div className="approval-filter">
              <button
                className={`filter-btn ${approvalFilter === undefined ? 'active' : ''}`}
                onClick={() => handleApprovalFilterChange(undefined)}
              >
                All
              </button>
              <button
                className={`filter-btn ${approvalFilter === true ? 'active' : ''}`}
                onClick={() => handleApprovalFilterChange(true)}
              >
                ✅ Approved
              </button>
              <button
                className={`filter-btn ${approvalFilter === false ? 'active' : ''}`}
                onClick={() => handleApprovalFilterChange(false)}
              >
                ⏳ Pending
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="resource-list-summary">
        <span className="results-count">
          {totalElements} resource{totalElements !== 1 ? 's' : ''} found
        </span>
        {searchTerm && (
          <span className="search-term">for "{searchTerm}"</span>
        )}
        {selectedCategory && (
          <span className="category-filter-display">
            in {getResourceCategoryLabel(selectedCategory as ResourceCategory)}
          </span>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading resources...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && resources.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>No resources found</h3>
          <p>
            {searchTerm || selectedCategory
              ? 'Try adjusting your search or filter criteria'
              : 'Be the first to add a resource to the library!'}
          </p>
          {user && (
            <div className="empty-actions">
              <button className="btn btn-secondary" onClick={onCreateNew}>
                📝 Add Text Resource
              </button>
              <button className="btn btn-primary" onClick={onCreateWithFile}>
                📁 Upload File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resource Grid */}
      {!loading && resources.length > 0 && (
        <div className="resource-grid">
          {resources.map(renderResourceCard)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
          >
            ⏮️
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            ⏪
          </button>
          
          <span className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            ⏩
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
          >
            ⏭️
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourceList;