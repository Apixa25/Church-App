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
 * Check if a video URL is MP4 (compatible with iOS)
 */
export const isMP4Url = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.mp4') || url.toLowerCase().includes('.mp4?');
};

/**
 * Check if a video is incompatible with iOS (WebM format on iOS)
 * IMPORTANT: If URL is MP4, it's compatible regardless of mediaType
 * (mediaType might be stale if backend returned optimized URL)
 */
export const isVideoIncompatibleWithIOS = (mediaType: string | undefined, url?: string): boolean => {
  if (!isIOS()) return false;
  
  // If URL is MP4, it's compatible with iOS (even if mediaType says webm)
  // This handles the case where backend returns optimized MP4 URL but mediaType is still webm
  if (url && isMP4Url(url)) {
    return false; // MP4 is compatible
  }
  
  // If URL is WebM, it's incompatible
  if (url && isWebMUrl(url)) {
    return true; // WebM is incompatible
  }
  
  // If we only have mediaType, check that
  // But only if URL doesn't exist or doesn't give us a clear answer
  if (mediaType && isWebMFormat(mediaType)) {
    return true; // WebM format is incompatible
  }
  
  return false; // Default to compatible (unknown format)
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

