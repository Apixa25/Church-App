/**
 * Utility functions for video format detection and iOS compatibility
 */

/**
 * Detect if the current device is iOS (iPhone, iPad, iPod)
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Check if a video format is WebM
 */
export const isWebMFormat = (mediaType: string | undefined): boolean => {
  if (!mediaType) return false;
  return mediaType.toLowerCase().includes('webm');
};

/**
 * Check if a video URL is likely WebM based on file extension
 */
export const isWebMUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.webm') || url.toLowerCase().includes('.webm?');
};

/**
 * Check if a video is incompatible with iOS (WebM format on iOS)
 */
export const isVideoIncompatibleWithIOS = (mediaType: string | undefined, url?: string): boolean => {
  if (!isIOS()) return false;
  return isWebMFormat(mediaType) || isWebMUrl(url);
};

/**
 * Get a user-friendly error message for unsupported video formats
 */
export const getVideoErrorMessage = (mediaType: string | undefined, url?: string): string => {
  if (isVideoIncompatibleWithIOS(mediaType, url)) {
    return 'This video is being processed for iPhone compatibility. Please try again in a moment.';
  }
  return 'Unable to play this video. Please try again later.';
};

