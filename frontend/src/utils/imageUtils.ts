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
export const convertImageToJpeg = async (
  file: File, 
  maxWidth = 1920, 
  maxHeight = 1920, 
  quality = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    // If already JPEG and small enough, return as-is
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg';
    if (isJpeg && file.size < 2 * 1024 * 1024) { // 2MB threshold
      console.log('📷 Image is already small JPEG, skipping conversion');
      resolve(file);
      return;
    }

    console.log('🔄 Converting image to JPEG:', file.name, 'Type:', file.type, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');

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
  
  // Check for HEIC/HEIF
  if (fileType.includes('heic') || fileType.includes('heif') ||
      fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    return true;
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
 * Process an image file for upload - converts HEIC and compresses large files
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
    if (needsImageConversion(file)) {
      console.log('🔄 HEIC/unknown format detected, converting to JPEG...');
      return await convertImageToJpeg(file, maxWidth, maxHeight, 0.85);
    }
    
    // Compress large files
    if (file.size > sizeThreshold) {
      console.log('🔄 Large file detected, compressing...');
      return await convertImageToJpeg(file, maxWidth, maxHeight, 0.85);
    }
    
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

