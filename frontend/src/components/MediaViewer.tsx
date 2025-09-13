import React, { useState, useEffect } from 'react';
import './MediaViewer.css';

interface MediaViewerProps {
  mediaUrls: string[];
  mediaTypes: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const MediaViewer: React.FC<MediaViewerProps> = ({
  mediaUrls,
  mediaTypes,
  isOpen,
  onClose,
  initialIndex = 0
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsLoading(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : mediaUrls.length - 1));
    setIsLoading(true);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < mediaUrls.length - 1 ? prev + 1 : 0));
    setIsLoading(true);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
  };

  if (!isOpen || mediaUrls.length === 0) return null;

  const currentUrl = mediaUrls[currentIndex];
  const currentType = mediaTypes[currentIndex] || 'image';
  const isImage = currentType.startsWith('image');
  const isVideo = currentType.startsWith('video');

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="media-viewer-close"
          onClick={onClose}
          aria-label="Close media viewer"
        >
          ✕
        </button>

        {/* Navigation Buttons */}
        {mediaUrls.length > 1 && (
          <>
            <button
              className="media-viewer-nav media-viewer-prev"
              onClick={handlePrevious}
              aria-label="Previous media"
            >
              ‹
            </button>
            <button
              className="media-viewer-nav media-viewer-next"
              onClick={handleNext}
              aria-label="Next media"
            >
              ›
            </button>
          </>
        )}

        {/* Media Content */}
        <div className="media-viewer-content">
          {isLoading && (
            <div className="media-viewer-loading">
              <div className="loading-spinner"></div>
            </div>
          )}

          {isImage && (
            <img
              src={currentUrl}
              alt={`Media ${currentIndex + 1} of ${mediaUrls.length}`}
              className="media-viewer-image"
              onLoad={handleImageLoad}
              onError={() => setIsLoading(false)}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {isVideo && (
            <video
              src={currentUrl}
              controls
              autoPlay
              className="media-viewer-video"
              onLoadedData={handleVideoLoad}
              onError={() => setIsLoading(false)}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}
        </div>

        {/* Media Counter */}
        {mediaUrls.length > 1 && (
          <div className="media-viewer-counter">
            {currentIndex + 1} of {mediaUrls.length}
          </div>
        )}

        {/* Thumbnail Strip */}
        {mediaUrls.length > 1 && (
          <div className="media-viewer-thumbnails">
            {mediaUrls.map((url, index) => {
              const type = mediaTypes[index] || 'image';
              const isThumbnailImage = type.startsWith('image');

              return (
                <button
                  key={index}
                  className={`media-thumbnail ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsLoading(true);
                  }}
                  aria-label={`View media ${index + 1}`}
                >
                  {isThumbnailImage ? (
                    <img
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      className="thumbnail-image"
                    />
                  ) : (
                    <div className="thumbnail-video">
                      <video
                        src={url}
                        className="thumbnail-video-preview"
                      />
                      <div className="video-icon">▶</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaViewer;
