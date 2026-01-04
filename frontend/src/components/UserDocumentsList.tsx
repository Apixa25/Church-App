import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { resourceAPI } from '../services/resourceApi';
import {
  Resource,
  getResourceCategoryLabel,
  formatFileSize,
  getFileIconByType,
  isYouTubeResource
} from '../types/Resource';
import './UserDocumentsList.css';

interface UserDocumentsListProps {
  userId: string;
  isOwnProfile: boolean;
}

const UserDocumentsList: React.FC<UserDocumentsListProps> = ({
  userId,
  isOwnProfile,
}) => {
  const navigate = useNavigate();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const pageSize = 12;

  const loadResources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await resourceAPI.getUserPublicResources(userId, currentPage, pageSize);

      setResources(response.data.resources);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (err: any) {
      console.error('Error loading user resources:', err);
      setError(err.response?.data?.error || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [userId, currentPage]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleViewResource = (resource: Resource) => {
    navigate(`/resources/${resource.id}`);
  };

  const handleDownload = async (resource: Resource, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!resource.fileUrl) return;

    try {
      await resourceAPI.trackDownload(resource.id);
      window.open(resource.fileUrl, '_blank');
    } catch (error) {
      console.error('Error tracking download:', error);
      window.open(resource.fileUrl, '_blank');
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return 'Unknown Date';

    let date: Date;

    if (Array.isArray(dateInput) && dateInput.length >= 6) {
      const [year, month, day, hour, minute, second] = dateInput;
      date = new Date(year, month - 1, day, hour, minute, second);
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Invalid Date';
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="user-documents-list">
        <div className="documents-loading">
          <div className="loading-spinner"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="user-documents-list">
        <div className="documents-error">
          <p>{error}</p>
          <button onClick={loadResources} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <div className="user-documents-list">
        <div className="documents-empty">
          <div className="empty-icon">📄</div>
          <h3>No documents yet</h3>
          <p>
            {isOwnProfile
              ? "You haven't uploaded any documents yet."
              : "This user hasn't uploaded any documents yet."}
          </p>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/resources')}
              className="upload-btn"
            >
              Upload a Document
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="user-documents-list">
      {/* Results count */}
      <div className="documents-summary">
        <span className="documents-count">
          {totalElements} document{totalElements !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Documents grid */}
      <div className="documents-grid">
        {resources.map((resource) => (
          <div
            key={resource.id}
            className="document-card"
            onClick={() => handleViewResource(resource)}
          >
            {/* YouTube Thumbnail */}
            {isYouTubeResource(resource) && resource.youtubeThumbnailUrl && (
              <div className="document-thumbnail">
                <img
                  src={resource.youtubeThumbnailUrl}
                  alt="Video thumbnail"
                  className="thumbnail-img"
                />
                <div className="video-badge">VIDEO</div>
              </div>
            )}

            <div className="document-card-content">
              <div className="document-header">
                <div className="document-icon">
                  {getFileIconByType(resource.fileType)}
                </div>
                <span className="document-category">
                  {getResourceCategoryLabel(resource.category)}
                </span>
              </div>

              <h4 className="document-title">{resource.title}</h4>

              {resource.description && (
                <p className="document-description">
                  {resource.description.length > 80
                    ? `${resource.description.substring(0, 80)}...`
                    : resource.description}
                </p>
              )}

              <div className="document-footer">
                <div className="document-stats">
                  <span className="document-date">{formatDate(resource.createdAt)}</span>
                  {resource.fileSize && (
                    <span className="document-size">{formatFileSize(resource.fileSize)}</span>
                  )}
                  <span className="document-downloads">↓{resource.downloadCount}</span>
                </div>

                {resource.fileUrl && (
                  <button
                    className="download-btn"
                    onClick={(e) => handleDownload(resource, e)}
                    title="Download"
                  >
                    ⬇️
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="documents-pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
          >
            ⏮️
          </button>
          <button
            className="page-btn"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            ⏪
          </button>

          <span className="page-info">
            {currentPage + 1} / {totalPages}
          </span>

          <button
            className="page-btn"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            ⏩
          </button>
          <button
            className="page-btn"
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

export default UserDocumentsList;
