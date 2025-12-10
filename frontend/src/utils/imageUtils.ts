/**
 * Image utility functions for handling HEIC conversion and compression
 * 
 * Why this exists:
 * - iPhone cameras default to HEIC format which Java's ImageIO cannot process
 * - iOS Safari can read HEIC natively and render to canvas
 * - We convert to JPEG client-side for universal server compatibility
 * - This also compresses large images before upload for faster transfers
 */

/**
 * Convert any image file to JPEG using HTML Canvas
 * This handles HEIC/HEIF files from iPhone which Java's ImageIO cannot process
 * 
 * @param file - The image file to convert
 * @param maxWidth - Maximum width (default 1920)
 * @param maxHeight - Maximum height (default 1920)
 * @param quality - JPEG quality 0-1 (default 0.85)
 * @returns Promise<File> - The converted JPEG file
 */
/**
 * Add timeout to image conversion to prevent hanging on iPhone
 * iPhone Safari can sometimes hang on large HEIC files
 */
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

export const convertImageToJpeg = async (
  file: File, 
  maxWidth = 1920, 
  maxHeight = 1920, 
  quality = 0.85
): Promise<File> => {
  // Add timeout for iPhone - large HEIC files can hang
  const conversionPromise = new Promise<File>((resolve, reject) => {
    // Industry best practice: Don't recompress small JPEGs that are already optimized
    // This check is now handled in processImageForUpload, but kept here as a safety net
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    if (isJpeg && file.size < 2 * 1024 * 1024) { // 2MB threshold
      console.log('📷 Image is already small optimized JPEG, skipping conversion');
      resolve(file);
      return;
    }

    console.log('🔄 Converting/compressing image to JPEG:', {
      name: file.name,
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      maxDimensions: `${maxWidth}x${maxHeight}`,
      quality: Math.round(quality * 100) + '%'
    });

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Create object URL to load the image
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Clean up object URL
      URL.revokeObjectURL(url);
      
      try {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image to canvas (this converts HEIC to bitmap internally)
        ctx?.drawImage(img, 0, 0, width, height);

        // Export as JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create new File object with .jpg extension
              const jpegFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const jpegFile = new File([blob], jpegFileName, { type: 'image/jpeg' });
              
              const reduction = Math.round((1 - jpegFile.size / file.size) * 100);
              console.log('✅ Image converted to JPEG:', jpegFileName, 
                'Original:', (file.size / 1024 / 1024).toFixed(2) + 'MB',
                '→ New:', (jpegFile.size / 1024 / 1024).toFixed(2) + 'MB',
                `(${reduction}% ${reduction > 0 ? 'reduction' : 'increase'})`);
              
              resolve(jpegFile);
            } else {
              reject(new Error('Failed to convert image to JPEG'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.error('❌ Error during image conversion:', err);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      console.error('❌ Failed to load image for conversion:', err);
      // If we can't load the image, try to return original and let server handle it
      console.warn('⚠️ Returning original file as fallback');
      resolve(file);
    };

    img.src = url;
  });
  
  // Wrap with timeout - iPhone Safari can hang on large HEIC files
  // 30 seconds should be enough for most images, but we'll timeout to prevent hanging
  try {
    return await withTimeout(
      conversionPromise,
      30000, // 30 second timeout
      'Image conversion timed out. This can happen with very large images on iPhone.'
    );
  } catch (error) {
    console.error('❌ Image conversion timeout or error:', error);
    // Return original file as fallback - let server handle it
    console.warn('⚠️ Returning original file - server will process it');
    return file;
  }
};

/**
 * Check if a file needs HEIC/format conversion
 * 
 * @param file - The file to check
 * @returns boolean - True if conversion is recommended
 */
export const needsImageConversion = (file: File): boolean => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  // Check for HEIC/HEIF explicitly
  if (fileType.includes('heic') || fileType.includes('heif') ||
      fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    return true;
  }
  
  // iPhone-specific: Photos from iPhone camera often have:
  // - Empty type or 'application/octet-stream'
  // - Large file size (>5MB is common for HEIC)
  // - No extension or generic extension
  // If it's a large file with unknown/empty type, it's likely HEIC from iPhone
  const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
  if (isIPhone && (fileType === '' || fileType === 'application/octet-stream')) {
    // Large files from iPhone are likely HEIC
    if (file.size > 3 * 1024 * 1024) { // >3MB
      console.log('📱 iPhone large file with unknown type detected, assuming HEIC:', {
        fileName: file.name,
        fileType: file.type || '(empty)',
        size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
      });
      return true;
    }
    
    // Check by extension as fallback
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    const hasImageExtension = validImageExtensions.some(ext => fileName.endsWith(ext));
    if (hasImageExtension) {
      return true; // Convert if it looks like an image
    }
  }
  
  // Check for unknown type (common on mobile)
  if (fileType === '' || fileType === 'application/octet-stream') {
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    const hasImageExtension = validImageExtensions.some(ext => fileName.endsWith(ext));
    return hasImageExtension; // Convert if it looks like an image
  }
  
  return false;
};

/**
 * Process an image file for upload - smart compression following industry best practices
 * 
 * Industry standard approach (Instagram/X.com):
 * - Always convert HEIC/HEIF (server compatibility)
 * - Only compress large files (>5MB) to reduce upload time
 * - Skip processing for small, already-optimized JPEGs (<2MB)
 * - Preserve quality (85% JPEG, max 1920x1920)
 * 
 * @param file - The image file to process
 * @param maxWidth - Maximum width (default 1920)
 * @param maxHeight - Maximum height (default 1920)
 * @param sizeThreshold - Size in bytes above which to compress (default 5MB)
 * @returns Promise<File> - The processed file
 */
export const processImageForUpload = async (
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  sizeThreshold = 5 * 1024 * 1024
): Promise<File> => {
  // Skip videos
  if (file.type.startsWith('video/')) {
    return file;
  }
  
  try {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const isJpeg = fileType === 'image/jpeg' || fileType === 'image/jpg';
    const isHeic = needsImageConversion(file);
    const isLarge = file.size > sizeThreshold;
    
    // Industry best practice: Skip processing for small, already-optimized JPEGs
    // This matches Instagram/X.com behavior - don't recompress what's already optimized
    if (isJpeg && file.size < 2 * 1024 * 1024) {
      console.log('✅ Small optimized JPEG detected, skipping processing:', {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        reason: 'Already optimized'
      });
      return file;
    }
    
    // Always convert HEIC/HEIF - server can't process these formats
    // HEIC files are often large anyway, so this handles both conversion and compression
    if (isHeic) {
      console.log('🔄 HEIC/HEIF format detected (iPhone default), converting to JPEG:', {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        reason: 'Server compatibility + compression'
      });
      return await convertImageToJpeg(file, maxWidth, maxHeight, 0.85);
    }
    
    // Compress large files (>5MB) - reduces upload time on mobile networks
    // This is the Instagram/X.com approach: compress only when it makes a difference
    if (isLarge) {
      console.log('🔄 Large file detected, compressing for faster upload:', {
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
        reason: 'Upload speed optimization'
      });
      return await convertImageToJpeg(file, maxWidth, maxHeight, 0.85);
    }
    
    // File is already in a good format and size - no processing needed
    console.log('✅ Image ready for upload (no processing needed):', {
      name: file.name,
      type: file.type,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      reason: 'Already optimized'
    });
    return file;
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    console.warn('⚠️ Using original file as fallback');
    return file;
  }
};

/**
 * Validate if a file is a supported image type
 * 
 * @param file - The file to validate
 * @returns boolean - True if the file appears to be a valid image
 */
export const isValidImageFile = (file: File): boolean => {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  
  // Check by MIME type first
  const hasValidType = fileType.startsWith('image/') || validImageTypes.includes(fileType);
  
  // Check by extension as fallback
  const hasValidExtension = validImageExtensions.some(ext => fileName.endsWith(ext));
  
  // Accept if either type or extension is valid (mobile browsers may not report correct MIME type)
  // Also accept empty/generic types if extension looks like an image
  return hasValidType || hasValidExtension || 
    (fileType === '' && hasValidExtension) ||
    (fileType === 'application/octet-stream' && hasValidExtension);
};

