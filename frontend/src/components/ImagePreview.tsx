import React, { useState, useEffect } from 'react';
import { MediaFile } from '../types/Post';
import './ImagePreview.css';

interface ImagePreviewProps {
  mediaFile: MediaFile;
  onRemove?: () => void;
  onEdit?: (editedFile: MediaFile) => void;
  editable?: boolean;
  size?: 'small' | 'medium' | 'large';
  showControls?: boolean;
  showInfo?: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  mediaFile,
  onRemove,
  onEdit,
  editable = false,
  size = 'medium',
  showControls = true,
  showInfo = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Preload image
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = mediaFile.url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [mediaFile.url]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(false);
    setImageError(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getImageDimensions = (): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.src = mediaFile.url;
    });
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'image-preview-small';
      case 'large': return 'image-preview-large';
      default: return 'image-preview-medium';
    }
  };

  if (imageError) {
    return (
      <div className={`image-preview error ${getSizeClass()}`}>
        <div className="error-content">
          <div className="error-icon">🖼️</div>
          <div className="error-text">
            <div className="error-title">Image failed to load</div>
            <div className="error-details">{mediaFile.name}</div>
          </div>
          {onRemove && (
            <button
              className="remove-button"
              onClick={onRemove}
              aria-label="Remove image"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`image-preview ${getSizeClass()} ${imageLoaded ? 'loaded' : 'loading'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="image-container">
        {!imageLoaded && (
          <div className="image-loading">
            <div className="loading-spinner"></div>
            <span>Loading...</span>
          </div>
        )}

        <img
          src={mediaFile.url}
          alt={mediaFile.name}
          className={`preview-image ${imageLoaded ? 'visible' : 'hidden'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />

        {/* Image Overlay (for controls) */}
        {showControls && isHovered && imageLoaded && (
          <div className="image-overlay">
            <div className="overlay-controls">
              {editable && onEdit && (
                <button
                  className="edit-button"
                  onClick={() => onEdit(mediaFile)}
                  aria-label="Edit image"
                  title="Edit image"
                >
                  ✏️
                </button>
              )}

              {onRemove && (
                <button
                  className="remove-button"
                  onClick={onRemove}
                  aria-label="Remove image"
                  title="Remove image"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Image Info */}
      {showInfo && (
        <div className="image-info">
          <div className="file-name" title={mediaFile.name}>
            {mediaFile.name.length > 20
              ? `${mediaFile.name.substring(0, 20)}...`
              : mediaFile.name}
          </div>

          <div className="file-details">
            <span className="file-size">
              {formatFileSize(mediaFile.size)}
            </span>

            {imageLoaded && (
              <span className="image-type">Image</span>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {!imageLoaded && !imageError && (
        <div className="image-loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;
