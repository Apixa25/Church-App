import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import LoadingSpinner from './LoadingSpinner';
import { isVideoIncompatibleWithIOS, getVideoErrorMessage } from '../utils/videoUtils';
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
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setImageLoaded(false);
      setVideoError(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialIndex]);

  // Handle Escape key to close
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageLoaded(true);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setImageLoaded(true);
  };

  if (!isOpen || mediaUrls.length === 0) return null;

  // Only show the single clicked image (no navigation between images)
  const currentUrl = mediaUrls[initialIndex];
  const currentType = mediaTypes[initialIndex] || 'image';
  const isImage = currentType.startsWith('image');
  const isVideo = currentType.startsWith('video');

  const modalContent = (
    <div 
      className="media-viewer-overlay" 
      onClick={onClose}
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div className="media-viewer-container">
        {/* Media Content - Click anywhere on the image/video to close */}
        <div className="media-viewer-content">
          {isLoading && (
            <div className="media-viewer-loading">
              <LoadingSpinner type="multi-ring" size="medium" />
            </div>
          )}

          {isImage && (
            <img
              src={currentUrl}
              alt="Full size media - click to close"
              className="media-viewer-image media-viewer-clickable"
              onClick={onClose}
              onLoad={handleImageLoad}
              onError={() => {
                setIsLoading(false);
                setImageLoaded(true);
              }}
              style={{ 
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
                cursor: 'pointer'
              }}
            />
          )}

          {isVideo && (
            videoError ? (
              <div className="media-viewer-error">
                <p>{videoError}</p>
                <small>Video is being processed for iPhone compatibility</small>
                <button onClick={onClose} className="media-viewer-close-button">Close</button>
              </div>
            ) : (
              <video
                src={currentUrl}
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                className="media-viewer-video media-viewer-clickable"
                onClick={onClose}
                onLoadedData={handleVideoLoad}
                onError={(e) => {
                  const video = e.currentTarget as HTMLVideoElement;
                  const error = video.error;
                  
                  console.error('Video playback error:', {
                    url: currentUrl,
                    mediaType: currentType,
                    errorCode: error?.code,
                    errorMessage: error?.message
                  });
                  
                  setIsLoading(false);
                  setImageLoaded(true);
                  
                  // Check if it's a WebM format on iOS
                  if (isVideoIncompatibleWithIOS(currentType, currentUrl)) {
                    setVideoError(getVideoErrorMessage(currentType, currentUrl));
                  } else if (error) {
                    if (error.code === 4) {
                      setVideoError('Video format not supported on this device');
                    } else {
                      setVideoError('Unable to play video. Please try again later.');
                    }
                  }
                }}
                style={{ 
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease',
                  cursor: 'pointer'
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );

  // Render at document body level using Portal for proper fixed positioning
  return createPortal(modalContent, document.body);
};

export default MediaViewer;
