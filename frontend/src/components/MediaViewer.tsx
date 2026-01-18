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

  // Pinch-to-zoom state
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch/pinch state refs
  const touchStateRef = useRef({
    initialDistance: 0,
    currentDistance: 0,
    isPinching: false,
    pinchActivated: false,
    startScale: 1,
    targetScale: 1,
    animationFrameId: null as number | null,
    touchStartX: 0,
    touchStartY: 0,
    lastTouchX: 0,
    lastTouchY: 0,
    pinchCenterX: 0,
    pinchCenterY: 0,
    isPanning: false,
    startTranslateX: 0,
    startTranslateY: 0,
    lastTapTime: 0,
    doubleTapTimeout: null as NodeJS.Timeout | null
  });

  // Reset zoom when opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setImageLoaded(false);
      setVideoError(null);
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);
      touchStateRef.current = {
        initialDistance: 0,
        currentDistance: 0,
        isPinching: false,
        pinchActivated: false,
        startScale: 1,
        targetScale: 1,
        animationFrameId: null,
        touchStartX: 0,
        touchStartY: 0,
        lastTouchX: 0,
        lastTouchY: 0,
        pinchCenterX: 0,
        pinchCenterY: 0,
        isPanning: false,
        startTranslateX: 0,
        startTranslateY: 0,
        lastTapTime: 0,
        doubleTapTimeout: null
      };
      // Store original overflow to restore exactly what it was
      const originalOverflow = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
      
      // Return cleanup function that ALWAYS restores scroll
      return () => {
        // 🔧 FIX: Always restore body overflow, even if component unmounts unexpectedly
        document.body.style.overflow = originalOverflow || '';
        if (touchStateRef.current.animationFrameId) {
          cancelAnimationFrame(touchStateRef.current.animationFrameId);
        }
      };
    } else {
      // 🔧 FIX: When closing, always ensure body overflow is restored
      document.body.style.overflow = '';
      
      return () => {
        // Extra safety: ensure cleanup on unmount even when closed
        document.body.style.overflow = '';
        if (touchStateRef.current.animationFrameId) {
          cancelAnimationFrame(touchStateRef.current.animationFrameId);
        }
      };
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
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

  // Calculate distance between two touch points
  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  // Smooth animation loop - max 5% change per frame
  const animateToScale = () => {
    const state = touchStateRef.current;

    setScale(currentScale => {
      const diff = state.targetScale - currentScale;
      const maxChange = 0.05; // Max 5% change per frame

      if (Math.abs(diff) < 0.001) {
        // Close enough, stop animating
        if (state.animationFrameId) {
          cancelAnimationFrame(state.animationFrameId);
          state.animationFrameId = null;
        }
        return state.targetScale;
      }

      // Apply max 5% change
      const change = Math.sign(diff) * Math.min(Math.abs(diff), maxChange);
      const newScale = currentScale + change;

      // Continue animation
      state.animationFrameId = requestAnimationFrame(animateToScale);

      return newScale;
    });
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    const state = touchStateRef.current;

    if (e.touches.length === 2) {
      // Two-finger pinch zoom
      e.preventDefault();

      const distance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);

      // Get image element position
      const imageElement = imageRef.current;
      if (!imageElement) return;

      const rect = imageElement.getBoundingClientRect();

      // Calculate pinch center relative to image center
      state.pinchCenterX = center.x - rect.left - rect.width / 2;
      state.pinchCenterY = center.y - rect.top - rect.height / 2;

      state.initialDistance = distance;
      state.currentDistance = distance;
      state.isPinching = true;
      state.pinchActivated = false;
      state.startScale = scale;
      state.targetScale = scale;
      state.startTranslateX = translateX;
      state.startTranslateY = translateY;
      state.isPanning = false;

      // Cancel any ongoing animation
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
      }
    } else if (e.touches.length === 1) {
      const now = Date.now();
      const timeSinceLastTap = now - state.lastTapTime;

      // Detect double-tap (within 300ms)
      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double-tap detected - reset to center
        e.preventDefault();

        state.targetScale = 1;
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);

        state.lastTapTime = 0; // Reset to prevent triple-tap

        if (!state.animationFrameId) {
          state.animationFrameId = requestAnimationFrame(animateToScale);
        }
      } else {
        // Single tap
        state.lastTapTime = now;

        if (scale > 1.05) {
          // One-finger panning (only when zoomed in)
          e.preventDefault();

          state.isPanning = true;
          state.isPinching = false;
          state.touchStartX = e.touches[0].clientX;
          state.touchStartY = e.touches[0].clientY;
          state.lastTouchX = e.touches[0].clientX;
          state.lastTouchY = e.touches[0].clientY;
          state.startTranslateX = translateX;
          state.startTranslateY = translateY;
        }
      }
    }
  };

  // Handle touch move - this is where the magic happens
  const handleTouchMove = (e: React.TouchEvent) => {
    const state = touchStateRef.current;

    if (e.touches.length === 2 && state.isPinching) {
      // Two-finger pinch zoom
      e.preventDefault();

      const distance = getDistance(e.touches[0], e.touches[1]);
      state.currentDistance = distance;

      // Calculate the change from initial touch
      const pixelChange = Math.abs(distance - state.initialDistance);
      const percentChange = pixelChange / state.initialDistance;

      // Activation threshold: 30px+ AND 20%+
      if (!state.pinchActivated) {
        if (pixelChange >= 30 && percentChange >= 0.20) {
          state.pinchActivated = true;
        } else {
          // Threshold not met yet - do nothing
          return;
        }
      }

      // Pinch is activated - calculate zoom
      // Only apply 21% of the finger spread (reduced by 30% from original 30%)
      const rawScaleChange = distance / state.initialDistance;
      const dampedScaleChange = 1 + (rawScaleChange - 1) * 0.21;

      // Calculate new target scale
      let newTargetScale = state.startScale * dampedScaleChange;

      // Clamp between 1x and 4x
      newTargetScale = Math.max(1, Math.min(4, newTargetScale));

      state.targetScale = newTargetScale;

      // Adjust translation to zoom from pinch center
      // As we zoom, move the image so the pinch point stays under the fingers
      const scaleRatio = newTargetScale / state.startScale;
      const newTranslateX = state.startTranslateX + state.pinchCenterX * (1 - scaleRatio);
      const newTranslateY = state.startTranslateY + state.pinchCenterY * (1 - scaleRatio);

      setTranslateX(newTranslateX);
      setTranslateY(newTranslateY);

      // Start smooth animation if not already running
      if (!state.animationFrameId) {
        state.animationFrameId = requestAnimationFrame(animateToScale);
      }
    } else if (e.touches.length === 1 && state.isPanning) {
      // One-finger panning
      e.preventDefault();

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const deltaX = currentX - state.touchStartX;
      const deltaY = currentY - state.touchStartY;

      // Reduce panning speed by 30% (multiply by 0.7)
      setTranslateX(state.startTranslateX + deltaX * 0.7);
      setTranslateY(state.startTranslateY + deltaY * 0.7);

      state.lastTouchX = currentX;
      state.lastTouchY = currentY;
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    const state = touchStateRef.current;

    if (e.touches.length === 0) {
      // All fingers lifted
      state.isPinching = false;
      state.pinchActivated = false;
      state.isPanning = false;

      // If zoomed out to 1x or less, reset to 1x and center position
      if (state.targetScale <= 1.05) {
        state.targetScale = 1;
        setTranslateX(0);
        setTranslateY(0);
        if (!state.animationFrameId) {
          state.animationFrameId = requestAnimationFrame(animateToScale);
        }
      }
    } else if (e.touches.length < 2) {
      // Went from 2+ fingers to 1 finger
      state.isPinching = false;
      state.pinchActivated = false;

      // If zoomed in and one finger remains, allow panning
      if (scale > 1.05) {
        state.isPanning = true;
        state.touchStartX = e.touches[0].clientX;
        state.touchStartY = e.touches[0].clientY;
        state.lastTouchX = e.touches[0].clientX;
        state.lastTouchY = e.touches[0].clientY;
        state.startTranslateX = translateX;
        state.startTranslateY = translateY;
      }
    }
  };

  // Handle overlay click - always closes
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle image click - closes the viewer only if not zoomed
  const handleImageClick = (e: React.MouseEvent) => {
    if (scale <= 1.05) {
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
        {/* Media Content - Simple full-screen display, click to close */}
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
              alt="Full size media - click to close"
              className="media-viewer-image media-viewer-clickable"
              onClick={handleImageClick}
              onLoad={handleImageLoad}
              onError={() => {
                setIsLoading(false);
                setImageLoaded(true);
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
                cursor: scale > 1.05 ? 'grab' : 'pointer',
                transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                transformOrigin: 'center center',
                willChange: 'transform'
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
