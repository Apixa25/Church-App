/**
 * Social Media URL Detection and Validation Utilities
 * Industry Standard: Following X.com's approach to URL pattern matching
 * 
 * Supports:
 * - X (Twitter): https://x.com/username/status/1234567890
 * - Facebook Reels: https://www.facebook.com/reel/2296029477541954
 * - Instagram Reels: https://www.instagram.com/reel/ABC123xyz/
 * - YouTube: https://www.youtube.com/watch?v=...
 */

export enum SocialMediaPlatform {
  X_POST = 'X_POST',
  FACEBOOK_REEL = 'FACEBOOK_REEL',
  FACEBOOK_POST = 'FACEBOOK_POST',
  INSTAGRAM_REEL = 'INSTAGRAM_REEL',
  YOUTUBE = 'YOUTUBE',
  UNKNOWN = 'UNKNOWN'
}

export interface SocialMediaUrlInfo {
  platform: SocialMediaPlatform;
  url: string;
  normalizedUrl: string;
  identifier?: string;
}

// URL patterns for detection
const X_STATUS_PATTERN = /(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/;
const FACEBOOK_REEL_PATTERN = /(?:www\.|m\.)?facebook\.com\/reel\/(\d+)/;
const FACEBOOK_POST_PATTERN = /facebook\.com\/[^/]+\/posts\//;
const INSTAGRAM_REEL_PATTERN = /(?:www\.)?instagram\.com\/reel\/([a-zA-Z0-9_-]+)/;
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
  /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
  /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
  /^https?:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/
];

/**
 * Detects the platform type from a URL
 */
export function detectPlatform(url: string): SocialMediaPlatform {
  if (!url || url.trim().length === 0) {
    return SocialMediaPlatform.UNKNOWN;
  }

  try {
    const normalizedUrl = normalizeUrl(url.trim());

    // Check YouTube
    if (YOUTUBE_PATTERNS.some(pattern => pattern.test(normalizedUrl))) {
      return SocialMediaPlatform.YOUTUBE;
    }

    // Check X/Twitter
    if (X_STATUS_PATTERN.test(normalizedUrl)) {
      return SocialMediaPlatform.X_POST;
    }

    // Check Facebook Reel (must check before generic post pattern)
    if (FACEBOOK_REEL_PATTERN.test(normalizedUrl)) {
      return SocialMediaPlatform.FACEBOOK_REEL;
    }

    // Check Facebook Post/Video
    if (FACEBOOK_POST_PATTERN.test(normalizedUrl)) {
      return SocialMediaPlatform.FACEBOOK_POST;
    }

    // Check Instagram Reel
    if (INSTAGRAM_REEL_PATTERN.test(normalizedUrl)) {
      return SocialMediaPlatform.INSTAGRAM_REEL;
    }

    return SocialMediaPlatform.UNKNOWN;
  } catch (error) {
    console.warn('Error detecting platform for URL:', url, error);
    return SocialMediaPlatform.UNKNOWN;
  }
}

/**
 * Validates if the URL is a supported social media URL
 */
export function isSupportedSocialMediaUrl(url: string): boolean {
  const platform = detectPlatform(url);
  return platform !== SocialMediaPlatform.UNKNOWN;
}

/**
 * Normalizes a URL (adds protocol if missing, validates format)
 */
function normalizeUrl(url: string): string {
  if (!url) return url;

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  return url;
}

/**
 * Normalizes URL for storage (removes tracking parameters)
 */
export function normalizeForStorage(url: string): string {
  if (!url || url.trim().length === 0) {
    return url;
  }

  try {
    let normalized = normalizeUrl(url.trim());

    const platform = detectPlatform(normalized);

    // Remove query parameters for X posts (but keep the status ID)
    if (platform === SocialMediaPlatform.X_POST) {
      const queryIndex = normalized.indexOf('?');
      if (queryIndex > 0) {
        normalized = normalized.substring(0, queryIndex);
      }
    }

    // Remove tracking parameters for Instagram
    if (platform === SocialMediaPlatform.INSTAGRAM_REEL) {
      const queryIndex = normalized.indexOf('?');
      if (queryIndex > 0) {
        normalized = normalized.substring(0, queryIndex);
      }
      // Remove trailing slash
      if (normalized.endsWith('/')) {
        normalized = normalized.substring(0, normalized.length - 1);
      }
    }

    return normalized;
  } catch (error) {
    console.warn('Error normalizing URL:', url, error);
    return url.trim();
  }
}

/**
 * Extracts URL information from a social media URL
 */
export function parseSocialMediaUrl(url: string): SocialMediaUrlInfo | null {
  if (!url || url.trim().length === 0) {
    return null;
  }

  const platform = detectPlatform(url);
  if (platform === SocialMediaPlatform.UNKNOWN) {
    return null;
  }

  const normalizedUrl = normalizeForStorage(url);

  let identifier: string | undefined;
  switch (platform) {
    case SocialMediaPlatform.X_POST:
      const xMatch = url.match(X_STATUS_PATTERN);
      if (xMatch) {
        identifier = `${xMatch[1]}/${xMatch[2]}`;
      }
      break;
    case SocialMediaPlatform.FACEBOOK_REEL:
      const fbMatch = url.match(FACEBOOK_REEL_PATTERN);
      if (fbMatch) {
        identifier = fbMatch[1];
      }
      break;
    case SocialMediaPlatform.INSTAGRAM_REEL:
      const igMatch = url.match(INSTAGRAM_REEL_PATTERN);
      if (igMatch) {
        identifier = igMatch[1];
      }
      break;
  }

  return {
    platform,
    url: url.trim(),
    normalizedUrl,
    identifier
  };
}

/**
 * Gets display name for a platform
 */
export function getPlatformDisplayName(platform: SocialMediaPlatform): string {
  switch (platform) {
    case SocialMediaPlatform.X_POST:
      return 'X';
    case SocialMediaPlatform.FACEBOOK_REEL:
    case SocialMediaPlatform.FACEBOOK_POST:
      return 'Facebook';
    case SocialMediaPlatform.INSTAGRAM_REEL:
      return 'Instagram';
    case SocialMediaPlatform.YOUTUBE:
      return 'YouTube';
    default:
      return 'Unknown';
  }
}

/**
 * Detects URLs in text content
 * Returns array of detected URLs with their positions
 */
export function detectUrlsInText(text: string): Array<{ url: string; start: number; end: number }> {
  if (!text) return [];

  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches: Array<{ url: string; start: number; end: number }> = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    // Remove trailing punctuation that might not be part of the URL
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    
    if (isSupportedSocialMediaUrl(cleanUrl)) {
      matches.push({
        url: cleanUrl,
        start: match.index,
        end: match.index + cleanUrl.length
      });
    }
  }

  return matches;
}

