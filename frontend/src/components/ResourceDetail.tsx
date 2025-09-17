import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resourceAPI } from '../services/resourceApi';
import { 
  Resource, 
  getResourceCategoryLabel, 
  formatFileSize, 
  getFileIconByType,
  isYouTubeResource,
  generateYouTubeEmbedUrl
} from '../types/Resource';
import './ResourceDetail.css';

interface ResourceDetailProps {
  resourceId: string;
  onEdit: (resource: Resource) => void;
  onDelete: (resourceId: string) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

const ResourceDetail: React.FC<ResourceDetailProps> = ({
  resourceId,
  onEdit,
  onDelete,
  onBack,
  onError,
}) => {
  const { user } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isModerator = user?.role === 'MODERATOR';

  const loadResource = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 ResourceDetail: Loading resource with ID:', resourceId);
      const response = await resourceAPI.getResource(resourceId);
      console.log('✅ ResourceDetail: Full API response:', response.data);
      console.log('🔍 YouTube fields:', {
        youtubeUrl: response.data.youtubeUrl,
        youtubeVideoId: response.data.youtubeVideoId,
        youtubeThumbnailUrl: response.data.youtubeThumbnailUrl,
        youtubeTitle: response.data.youtubeTitle,
        fileType: response.data.fileType
      });
      setResource(response.data);
    } catch (error: any) {
      console.error('❌ ResourceDetail: Error loading resource:', error);
      onError(error.response?.data?.error || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  }, [resourceId, onError]);

  useEffect(() => {
    loadResource();
  }, [resourceId, loadResource]);

  const handleDownload = async () => {
    if (!resource?.fileUrl) {
      onError('No file available for download');
      return;
    }

    try {
      await resourceAPI.trackDownload(resource.id);
      window.open(resource.fileUrl, '_blank');
    } catch (error: any) {
      console.error('Error tracking download:', error);
      // Still allow download even if tracking fails
      window.open(resource.fileUrl, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!resource) return;

    const confirmDelete = window.confirm(
      'Are you sure you want to delete this resource? This action cannot be undone.'
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      await resourceAPI.deleteResource(resource.id);
      onDelete(resource.id);
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      onError(error.response?.data?.error || 'Failed to delete resource');
    } finally {
      setDeleting(false);
    }
  };

  const canEditResource = () => {
    if (!user || !resource) return false;
    return resource.uploadedById === user.userId || isAdmin || isModerator;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="resource-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading resource...</p>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="resource-detail-error">
        <h3>Resource Not Found</h3>
        <p>The requested resource could not be loaded.</p>
        <button className="btn btn-primary" onClick={onBack}>
          ⬅️ Back to Resources
        </button>
      </div>
    );
  }

  return (
    <div className="resource-detail">
      <div className="resource-detail-header">
        <div className="resource-detail-meta">
          <span className="resource-category">
            {getResourceCategoryLabel(resource.category)}
          </span>
          <span className="resource-date">
            {formatDate(resource.createdAt)}
          </span>
        </div>

        <h1 className="resource-title">{resource.title}</h1>

        <div className="resource-uploader">
          <img
            src={resource.uploaderProfilePicUrl || '/default-avatar.png'}
            alt={resource.uploaderName}
            className="uploader-avatar"
          />
          <div className="uploader-info">
            <div className="uploader-name">{resource.uploaderName}</div>
            <div className="upload-stats">
              ↓ {resource.downloadCount} downloads
            </div>
          </div>
        </div>
      </div>

      <div className="resource-detail-content">
        {resource.description && (
          <div className="resource-description">
            <h3>Description</h3>
            <div className="description-text">
              {resource.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        {/* YouTube Video Section */}
        {isYouTubeResource(resource) && resource.youtubeVideoId && (
          <div className="resource-youtube">
            <h3>🎥 Video</h3>
            <div className="youtube-container">
              <iframe
                src={generateYouTubeEmbedUrl(resource.youtubeVideoId)}
                title={resource.youtubeTitle || resource.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="youtube-iframe"
              ></iframe>
            </div>
            {resource.youtubeTitle && resource.youtubeTitle !== resource.title && (
              <div className="youtube-video-title">
                <strong>Video Title:</strong> {resource.youtubeTitle}
              </div>
            )}
            {resource.youtubeChannel && (
              <div className="youtube-channel">
                <strong>Channel:</strong> {resource.youtubeChannel}
              </div>
            )}
            {resource.youtubeDuration && (
              <div className="youtube-duration">
                <strong>Duration:</strong> {resource.youtubeDuration}
              </div>
            )}
            <div className="youtube-links">
              <a
                href={resource.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm"
              >
                🔗 Open on YouTube
              </a>
            </div>
          </div>
        )}

        {resource.fileUrl && (
          <div className="resource-file">
            <h3>File</h3>
            <div className="file-info">
              <div className="file-details">
                <span className="file-icon">
                  {getFileIconByType(resource.fileType)}
                </span>
                <div className="file-text">
                  <div className="file-name">{resource.fileName}</div>
                  <div className="file-meta">
                    {resource.fileType && (
                      <span className="file-type">
                        {resource.fileType.split('/')[1]?.toUpperCase() || 'FILE'}
                      </span>
                    )}
                    {resource.fileSize && (
                      <span className="file-size">
                        {formatFileSize(resource.fileSize)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                className="btn btn-primary download-btn"
                onClick={handleDownload}
              >
                ⬇️ Download
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="resource-detail-actions">
        {canEditResource() && (
          <div className="action-group">
            <button
              className="btn btn-outline-primary"
              onClick={() => onEdit(resource)}
            >
              ✏️ Edit
            </button>
            <button
              className="btn btn-outline-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <span className="loading-spinner-sm"></span>
                  Deleting...
                </>
              ) : (
                '🗑️ Delete'
              )}
            </button>
          </div>
        )}

        <button className="btn btn-secondary" onClick={onBack}>
          ⬅️ Back to Resources
        </button>
      </div>
    </div>
  );
};

export default ResourceDetail;