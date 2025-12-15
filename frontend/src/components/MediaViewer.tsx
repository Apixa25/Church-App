import React, { useState, useEffect, useRef } from 'react';
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
  
  // 🎯 Pinch-to-zoom state (industry standard: Instagram/Facebook/X behavior)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [isPinchActive, setIsPinchActive] = useState(false);
  const [initialPinchCenter, setInitialPinchCenter] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastDragPosition, setLastDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [lastTap, setLastTap] = useState(0);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const imageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Global handler to prevent browser viewport zoom
    const preventViewportZoom = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (isOpen) {
      setIsLoading(true);
      setImageLoaded(false);
      setVideoError(null);
      // Reset zoom state when opening new image
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setLastPinchDistance(null);
      setInitialPinchDistance(null);
      setIsPinchActive(false);
      setInitialPinchCenter(null);
      setIsDragging(false);
      setLastDragPosition(null);
      setDebugInfo('');
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Prevent HTML element zoom
      document.documentElement.style.touchAction = 'none';
      document.documentElement.style.overflow = 'hidden';
      
      // Prevent viewport zoom when modal is open
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }
      
      // Add global touch listeners to prevent browser zoom
      document.addEventListener('touchstart', preventViewportZoom, { passive: false, capture: true });
      document.addEventListener('touchmove', preventViewportZoom, { passive: false, capture: true });
      document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false, capture: true });
      document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false, capture: true });
      document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false, capture: true });
    } else {
      // Restore body styles
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      
      // Restore HTML styles
      document.documentElement.style.touchAction = '';
      document.documentElement.style.overflow = '';
      
      // Restore viewport settings
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
      }
      
      // Remove global touch listeners
      document.removeEventListener('touchstart', preventViewportZoom, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', preventViewportZoom, { capture: true } as EventListenerOptions);
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.touchAction = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen, initialIndex]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        // Reset zoom before closing
        setScale(1);
        setPosition({ x: 0, y: 0 });
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

  // 🎯 Calculate distance between two touch points
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 🎯 Calculate center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // 🎯 Handle touch start for pinch-to-zoom (industry standard)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // CRITICAL: Prevent default browser zoom behavior
      e.preventDefault();
      e.stopPropagation();
      
      // Two fingers - start pinch gesture
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      
      // Store initial values - wait for fingers to spread before zooming
      setInitialPinchDistance(distance);
      setLastPinchDistance(distance);
      setInitialPinchCenter(center);
      setIsPinchActive(false); // Don't zoom until fingers have moved apart
      
      // Debug info
      setDebugInfo(`TouchStart: 2 fingers, dist=${distance.toFixed(0)}px, scale=${scale.toFixed(2)}`);
      
      setIsDragging(false);
      setLastDragPosition(null);
    } else if (e.touches.length === 1 && scale > 1) {
      // Single finger when zoomed - start panning
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      setLastDragPosition({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  // 🎯 Handle touch move for pinch-to-zoom and panning
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Stop event propagation to prevent global handlers from interfering
      e.stopPropagation();
      e.preventDefault(); // Prevent scrolling while zooming/panning
    }
    
    if (e.touches.length === 2 && initialPinchDistance !== null && lastPinchDistance !== null && initialPinchCenter !== null) {
      // Two fingers - pinch gesture
      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      
      // Use BOTH absolute and percentage thresholds to prevent instant zoom
      // This ensures fingers must spread a meaningful distance before zoom starts
      const minAbsoluteChange = 30; // Minimum 30 pixels of movement (increased)
      const minPercentChange = 20; // Minimum 20% change from initial (increased)
      
      const absoluteChange = Math.abs(currentDistance - initialPinchDistance);
      const distanceChangePercent = initialPinchDistance > 0 ? (absoluteChange / initialPinchDistance) * 100 : 0;
      
      // Require BOTH thresholds to be met before zooming starts
      // This prevents instant zoom when fingers first touch (even if close together)
      if (!isPinchActive) {
        // Only activate if BOTH thresholds are met
        if (absoluteChange >= minAbsoluteChange && distanceChangePercent >= minPercentChange) {
          // Pinch gesture is now active - start zooming
          setIsPinchActive(true);
          // Reset last distance to current to start incremental tracking
          setLastPinchDistance(currentDistance);
          // Debug info
          setDebugInfo(`Pinch ACTIVE: abs=${absoluteChange.toFixed(0)}px, pct=${distanceChangePercent.toFixed(1)}%, scale=${scale.toFixed(2)}`);
          // Don't apply any zoom on this frame - wait for next frame
          return;
        } else {
          // Not enough movement yet - don't do anything
          setDebugInfo(`Waiting: abs=${absoluteChange.toFixed(0)}px/${minAbsoluteChange}px, pct=${distanceChangePercent.toFixed(1)}%/${minPercentChange}%, scale=${scale.toFixed(2)}`);
          return;
        }
      }
      
      // Only apply zoom if pinch is active (fingers have spread enough)
      if (isPinchActive && lastPinchDistance > 0) {
        // Use incremental scale changes for smooth zooming (industry standard)
        // Calculate change from last frame, not from initial
        const distanceRatio = currentDistance / lastPinchDistance;
        // Clamp the ratio to prevent huge jumps (max 1.1x per frame)
        const clampedRatio = Math.max(0.9, Math.min(1.1, distanceRatio));
        const newScale = Math.max(1, Math.min(5, scale * clampedRatio));
        
        // Debug info
        setDebugInfo(`Zooming: ratio=${distanceRatio.toFixed(3)}, clamped=${clampedRatio.toFixed(3)}, scale=${scale.toFixed(2)}→${newScale.toFixed(2)}`);
        
        // Calculate position to keep the pinch center point fixed
        if (imageRef.current) {
          const img = imageRef.current;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Get viewport center
          const viewportCenterX = viewportWidth / 2;
          const viewportCenterY = viewportHeight / 2;
          
          // Calculate offset from viewport center to initial pinch center
          const offsetX = initialPinchCenter.x - viewportCenterX;
          const offsetY = initialPinchCenter.y - viewportCenterY;
          
          // Calculate scale change
          const scaleChange = newScale / scale;
          
          // Calculate new position to keep pinch center fixed
          // As we zoom, we need to adjust position so the pinch point stays in the same screen location
          const newX = position.x - (offsetX * (scaleChange - 1));
          const newY = position.y - (offsetY * (scaleChange - 1));
          
          // Constrain position to image bounds
          const naturalWidth = img.naturalWidth || img.offsetWidth;
          const naturalHeight = img.naturalHeight || img.offsetHeight;
          const scaledWidth = naturalWidth * newScale;
          const scaledHeight = naturalHeight * newScale;
          const maxX = Math.max(0, (scaledWidth - viewportWidth) / 2);
          const maxY = Math.max(0, (scaledHeight - viewportHeight) / 2);
          
          setScale(newScale);
          setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY))
          });
        } else {
          setScale(newScale);
        }
      }
      
      // Always update last distance for next calculation
      setLastPinchDistance(currentDistance);
    } else if (e.touches.length === 1 && isDragging && lastDragPosition !== null && scale > 1) {
      // Single finger when zoomed - panning
      const newX = e.touches[0].clientX - lastDragPosition.x;
      const newY = e.touches[0].clientY - lastDragPosition.y;
      
      // Constrain panning to image bounds (adjusted for full-screen zoom)
      if (imageRef.current) {
        const img = imageRef.current;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get the natural image dimensions
        const naturalWidth = img.naturalWidth || img.offsetWidth;
        const naturalHeight = img.naturalHeight || img.offsetHeight;
        
        // Calculate the scaled dimensions
        const scaledWidth = naturalWidth * scale;
        const scaledHeight = naturalHeight * scale;
        
        // Calculate max pan distance (half the difference between scaled size and viewport)
        const maxX = Math.max(0, (scaledWidth - viewportWidth) / 2);
        const maxY = Math.max(0, (scaledHeight - viewportHeight) / 2);
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      }
    }
  };

  // 🎯 Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      // Stop event propagation
      e.stopPropagation();
      
      // Reset pinch tracking when pinch ends
      setLastPinchDistance(null);
      setInitialPinchDistance(null);
      setIsPinchActive(false);
      setInitialPinchCenter(null);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
      setLastDragPosition(null);
    }
  };

  // 🎯 Double-tap to zoom (Instagram/Facebook standard)
  const handleDoubleTap = (e: React.TouchEvent) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      if (scale === 1) {
        // Zoom in to 2x
        setScale(2);
      } else {
        // Zoom out to 1x
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
      e.preventDefault();
    }
    setLastTap(currentTime);
  };

  // 🎯 Handle overlay click - always closes (industry standard)
  const handleOverlayClick = (e: React.MouseEvent) => {
    // If clicking directly on the overlay (not the content container), always close
    if (e.target === e.currentTarget) {
      // Reset zoom before closing
      setScale(1);
      setPosition({ x: 0, y: 0 });
      onClose();
    }
  };

  // 🎯 Handle image click - only close if not zoomed (Instagram/Facebook standard)
  const handleImageClick = (e: React.MouseEvent) => {
    // Only close if scale is 1 (not zoomed) and not during a drag
    if (scale === 1 && !isDragging) {
      onClose();
    }
    // If zoomed, do nothing (user must zoom out or tap overlay to close)
  };

  if (!isOpen || mediaUrls.length === 0) return null;

  // Only show the single clicked image (no navigation between images)
  const currentUrl = mediaUrls[initialIndex];
  const currentType = mediaTypes[initialIndex] || 'image';
  const isImage = currentType.startsWith('image');
  const isVideo = currentType.startsWith('video');

  // 🎯 Calculate transform style for zoom and pan
  const imageTransform = `translate(${position.x}px, ${position.y}px) scale(${scale})`;
  const imageStyle: React.CSSProperties = {
    opacity: imageLoaded ? 1 : 0,
    transition: scale === 1 && position.x === 0 && position.y === 0 ? 'opacity 0.3s ease' : 'none',
    cursor: scale > 1 ? 'grab' : 'pointer',
    transform: imageTransform,
    transformOrigin: 'center center',
    touchAction: 'none', // Prevent default touch behaviors
    userSelect: 'none', // Prevent text selection
    WebkitUserSelect: 'none',
  };

  // 🎯 When zoomed, allow image to break out of container constraints (Instagram/X behavior)
  const isZoomed = scale > 1;

  const modalContent = (
    <div 
      className="media-viewer-overlay" 
      onClick={handleOverlayClick}
      onTouchStart={(e) => {
        // Prevent browser default zoom on overlay
        if (e.touches.length === 2) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onTouchMove={(e) => {
        // Prevent browser default zoom on overlay
        if (e.touches.length === 2) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      style={{ display: isOpen ? 'flex' : 'none' }}
    >
      <div className={`media-viewer-container ${isZoomed ? 'media-viewer-zoomed' : ''}`}>
        {/* Debug Info - Remove after testing */}
        {debugInfo && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 10000,
            fontFamily: 'monospace',
            maxWidth: '90vw'
          }}>
            {debugInfo}
          </div>
        )}
        {/* Media Content - Pinch to zoom, tap to close when not zoomed */}
        <div 
          className="media-viewer-content"
          ref={contentRef}
          onClick={(e) => e.stopPropagation()} // Prevent overlay click when clicking content area
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
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
              onTouchStart={(e) => {
                handleTouchStart(e);
                handleDoubleTap(e);
              }}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onLoad={handleImageLoad}
              onError={() => {
                setIsLoading(false);
                setImageLoaded(true);
              }}
              style={imageStyle}
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
