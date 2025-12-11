/**
 * Utility functions for handling image URLs, including CloudFront to S3 fallback
 */

const CLOUDFRONT_DOMAIN = 'd3loytcgioxpml.cloudfront.net';
const S3_BUCKET = 'church-app-uploads-stevensills2';
const S3_REGION = 'us-west-2';

/**
 * Convert a CloudFront URL to a direct S3 URL
 * This is used as a fallback when CloudFront isn't configured for certain paths
 * 
 * @param cloudFrontUrl CloudFront URL (e.g., https://d3loytcgioxpml.cloudfront.net/profile-pictures/originals/...)
 * @returns Direct S3 URL (e.g., https://church-app-uploads-stevensills2.s3.us-west-2.amazonaws.com/profile-pictures/originals/...)
 */
export function convertCloudFrontToS3Url(cloudFrontUrl: string): string {
  if (!cloudFrontUrl || !cloudFrontUrl.includes(CLOUDFRONT_DOMAIN)) {
    // Not a CloudFront URL, return as-is
    return cloudFrontUrl;
  }

  try {
    // Extract the path after the CloudFront domain
    const url = new URL(cloudFrontUrl);
    const path = url.pathname;
    
    // Construct S3 URL
    const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com${path}`;
    return s3Url;
  } catch (error) {
    console.error('Error converting CloudFront URL to S3 URL:', error);
    return cloudFrontUrl; // Return original if conversion fails
  }
}

/**
 * Get a fallback URL for an image
 * Tries CloudFront first, falls back to S3 if CloudFront fails
 * 
 * @param url Original URL (could be CloudFront or S3)
 * @returns Array with primary URL and fallback URL
 */
export function getImageUrlWithFallback(url: string): { primary: string; fallback: string } {
  if (!url) {
    return { primary: '', fallback: '' };
  }

  // If it's already an S3 URL, return as-is
  if (url.includes(`${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`)) {
    return { primary: url, fallback: url };
  }

  // If it's a CloudFront URL, provide S3 as fallback
  if (url.includes(CLOUDFRONT_DOMAIN)) {
    return {
      primary: url,
      fallback: convertCloudFrontToS3Url(url)
    };
  }

  // Unknown format, return as-is
  return { primary: url, fallback: url };
}

/**
 * Get banner image URL - tries CloudFront first, falls back to S3
 * Since we removed crossOrigin attribute, CloudFront should work for display
 * Only use S3 as fallback if CloudFront fails
 * 
 * @param url Original URL (could be CloudFront or S3)
 * @returns URL to try (CloudFront preferred, S3 as fallback)
 */
export function getBannerImageUrl(url: string): string {
  if (!url) {
    return '';
  }

  // If it's already an S3 URL, return as-is
  if (url.includes(`${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`)) {
    return url;
  }

  // If it's a CloudFront URL, use it directly (no crossOrigin, so CORS shouldn't block display)
  // The browser will load it fine for <img> tags without crossOrigin attribute
  if (url.includes(CLOUDFRONT_DOMAIN)) {
    return url; // Use CloudFront directly - should work without crossOrigin
  }

  // Unknown format, return as-is
  return url;
}

/**
 * Get S3 fallback URL for banner images (used in error handler)
 * 
 * @param url Original URL (could be CloudFront or S3)
 * @returns S3 URL for fallback
 */
export function getBannerImageS3Fallback(url: string): string {
  if (!url) {
    return '';
  }

  // If it's already an S3 URL, return as-is
  if (url.includes(`${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`)) {
    return url;
  }

  // If it's a CloudFront URL, convert to S3 for fallback
  if (url.includes(CLOUDFRONT_DOMAIN)) {
    return convertCloudFrontToS3Url(url);
  }

  // Unknown format, return as-is
  return url;
}

