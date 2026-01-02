import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resourceAPI } from '../services/resourceApi';
import { PublicResource, formatFileSize, getFileIconByType } from '../types/Resource';
import './PublicResourcePreview.css';

const PublicResourcePreview: React.FC = () => {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [resource, setResource] = useState<PublicResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!resourceId) return;
      try {
        setLoading(true);
        setError(null);
        const response = await resourceAPI.getPublicResource(resourceId);
        setResource(response.data);
      } catch (err: any) {
        console.error('Failed to load public resource', err);
        setError(err?.response?.data?.message || 'This resource is not available.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [resourceId]);

  const handleDownload = async () => {
    if (!resource?.fileUrl) return;

    // Track download
    try {
      await resourceAPI.trackDownload(resource.id);
    } catch (err) {
      console.error('Failed to track download:', err);
    }

    // Open file
    window.open(resource.fileUrl, '_blank');
  };

  const renderHeroSection = () => {
    if (resource?.youtubeThumbnailUrl) {
      return (
        <img
          className="public-resource-hero"
          src={resource.youtubeThumbnailUrl}
          alt={resource.title}
        />
      );
    }

    if (resource?.fileType?.startsWith('image/') && resource?.fileUrl) {
      return (
        <img
          className="public-resource-hero"
          src={resource.fileUrl}
          alt={resource.title}
        />
      );
    }

    return (
      <div className="public-resource-icon-hero">
        <span className="file-type-icon">{getFileIconByType(resource?.fileType)}</span>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="public-resource-card loading">
          <div className="spinner" />
          <p>Loading resource...</p>
        </div>
      );
    }

    if (error || !resource) {
      return (
        <div className="public-resource-card error">
          <h1>Resource unavailable</h1>
          <p>{error || 'This link may have expired or the resource is no longer available.'}</p>
        </div>
      );
    }

    return (
      <div className="public-resource-card">
        {renderHeroSection()}

        <div className="public-resource-content">
          <span className="public-resource-category">{resource.categoryLabel}</span>
          <h1>{resource.title}</h1>

          {resource.descriptionPreview && (
            <p className="public-resource-description">{resource.descriptionPreview}</p>
          )}

          <div className="public-resource-meta">
            {resource.uploaderAvatarUrl ? (
              <img
                className="public-resource-avatar"
                src={resource.uploaderAvatarUrl}
                alt={resource.uploaderName}
              />
            ) : (
              <div className="public-resource-avatar placeholder">
                {resource.uploaderName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="public-resource-author">
              <span className="author-name">Shared by {resource.uploaderName}</span>
              {resource.createdAt && (
                <time dateTime={resource.createdAt}>
                  {new Date(resource.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              )}
            </div>
          </div>

          <div className="public-resource-stats">
            <span>⬇️ {resource.downloadCount} downloads</span>
            <span>🔗 {resource.shareCount} shares</span>
          </div>

          {resource.fileName && (
            <div className="public-resource-file-info">
              <span className="file-icon">{getFileIconByType(resource.fileType)}</span>
              <span className="file-name">{resource.fileName}</span>
              {resource.fileSize && (
                <span className="file-size">{formatFileSize(resource.fileSize)}</span>
              )}
            </div>
          )}

          <div className="public-resource-actions">
            {resource.fileUrl && (
              <button className="public-resource-download-btn" onClick={handleDownload}>
                ⬇️ Download File
              </button>
            )}

            {resource.youtubeUrl && (
              <a
                className="public-resource-youtube-btn"
                href={resource.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶️ Watch on YouTube
              </a>
            )}

            <a className="public-resource-cta" href="/dashboard">
              Open in Church App →
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="public-resource-preview">
      {renderContent()}
    </div>
  );
};

export default PublicResourcePreview;
