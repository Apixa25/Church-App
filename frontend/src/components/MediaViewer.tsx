import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import LoadingSpinner from './LoadingSpinner';
import { isVideoIncompatibleWithIOS, getVideoErrorMessage } from '../utils/videoUtils';
import Panzoom, { PanzoomObject } from '@panzoom/panzoom';
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
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setImageLoaded(false);
      setVideoError(null);
      document.body.style.overflow = 'hidden';
      
      // Prevent viewport zoom when modal is open
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }
    } else {
      document.body.style.overflow = 'unset';
      
      // Clean up Panzoom instance
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
        panzoomRef.current = null;
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
        panzoomRef.current = null;
      }
    };
  }, [isOpen]);

  // Initialize Panzoom when image loads
  useEffect(() => {
    if (isOpen && imageLoaded && imageRef.current && !panzoomRef.current) {
      const panzoom = Panzoom(imageRef.current, {
        minScale: 1,
        maxScale: 5,
        step: 0.1,
        animate: true,
        contain: 'outside',
        pinchAndPan: true,
        // Smooth zoom settings like Instagram/X
        focal: { x: 0.5, y: 0.5 },
        // Prevent browser zoom
        touchAction: 'none',
        // Smooth zoom speed
        duration: 200,
        easing: 'ease-out'
      });

      panzoomRef.current = panzoom;

      // Handle double tap to zoom
      let lastTap = 0;
      imageRef.current.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTap;
        
        if (tapLength < 300 && tapLength > 0) {
          e.preventDefault();
          const currentScale = panzoom.getScale();
          if (currentScale === 1) {
            panzoom.zoom(2, { animate: true });
          } else {
            panzoom.reset({ animate: true });
          }
        }
        lastTap = currentTime;
      });

      // Prevent browser default zoom
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
        }
      };

      imageRef.current.addEventListener('touchstart', preventZoom, { passive: false });
      imageRef.current.addEventListener('touchmove', preventZoom, { passive: false });
    }

    return () => {
      if (panzoomRef.current) {
        panzoomRef.current.destroy();
        panzoomRef.current = null;
      }
    };
  }, [isOpen, imageLoaded]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (panzoomRef.current) {
          panzoomRef.current.reset({ animate: true });
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageLoaded(true);
  };

  const handleVideoLoad = () => {
    setIsLoading(false);
    setImageLoaded(true);
  };

  // 🎯 Handle overlay click - always closes (industry standard)
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (panzoomRef.current) {
        panzoomRef.current.reset({ animate: true });
      }
      onClose();
    }
  };

  // 🎯 Handle image click - only close if not zoomed (Instagram/Facebook standard)
  const handleImageClick = (e: React.MouseEvent) => {
    if (panzoomRef.current) {
      const currentScale = panzoomRef.current.getScale();
      if (currentScale === 1) {
        onClose();
      }
    } else {
      onClose();
    }
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
      onClick={handleOverlayClick}
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div className="media-viewer-container" ref={containerRef}>
        {/* Media Content - Pinch to zoom, tap to close when not zoomed */}
        <div className="media-viewer-content">
          {isLoading && (
            <div className="media-viewer-loading">
              <LoadingSpinner type="multi-ring" size="medium" />
            </div>
          )}

          {isImage && (
            <img
              ref={imageRef}
              src={currentUrl}
              alt="Full size media - pinch to zoom, tap to close"
              className="media-viewer-image media-viewer-clickable"
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              onError={() => {
                setIsLoading(false);
                setImageLoaded(true);
              }}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
                cursor: 'pointer',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
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
