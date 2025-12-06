import React, { useState, useRef, useCallback } from 'react';
import { MediaFile } from '../types/Post';
import './MediaUploader.css';

interface MediaUploaderProps {
  onFilesSelected: (files: MediaFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
  multiple?: boolean;
  showPreview?: boolean;
  compact?: boolean;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  onFilesSelected,
  maxFiles = 4,
  maxFileSize = 10, // Default: 10MB (will use 75MB for videos, 20MB for images if not overridden)
  acceptedTypes = ['image/*', 'video/*'],
  disabled = false,
  multiple = true,
  showPreview = true,
  compact = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<MediaFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const baseType = type.slice(0, -2);
        return file.type.startsWith(baseType);
      }
      return file.type === type;
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    // Check file size (different limits for images vs videos)
    // If maxFileSize is provided as prop, use it; otherwise use type-specific defaults
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const defaultMaxSize = isVideo ? 500 : (isImage ? 100 : maxFileSize); // 500MB for videos, 100MB for images, or prop value
    const effectiveMaxSize = maxFileSize !== 10 ? maxFileSize : defaultMaxSize; // Use prop if explicitly set, otherwise use defaults
    
    if (file.size > effectiveMaxSize * 1024 * 1024) {
      return `File size too large. Maximum size: ${effectiveMaxSize}MB${isVideo ? ' for videos' : isImage ? ' for images' : ''}`;
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: MediaFile[] = [];
    const errors: string[] = [];

    // Check total file count
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
        continue;
      }

      // Create media file object
      const mediaFile: MediaFile = {
        file,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' : 'video',
        name: file.name,
        size: file.size
      };

      validFiles.push(mediaFile);
    }

    // Show errors if any
    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    // Add valid files
    if (validFiles.length > 0) {
      const newFiles = [...uploadedFiles, ...validFiles];
      setUploadedFiles(newFiles);
      setError('');
      onFilesSelected(newFiles);
    }
  }, [uploadedFiles, maxFiles, maxFileSize, acceptedTypes, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set drag leave if we're actually leaving the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }

    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const removeFile = useCallback((index: number) => {
    const newFiles = [...uploadedFiles];
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(newFiles[index].url);
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
    onFilesSelected(newFiles);
  }, [uploadedFiles, onFilesSelected]);

  const clearAllFiles = useCallback(() => {
    // Revoke all object URLs
    uploadedFiles.forEach(file => URL.revokeObjectURL(file.url));
    setUploadedFiles([]);
    onFilesSelected([]);
    setError('');
  }, [uploadedFiles, onFilesSelected]);

  const getAcceptedTypesString = () => {
    return acceptedTypes.join(',');
  };

  const getRemainingSlots = () => {
    return maxFiles - uploadedFiles.length;
  };

  return (
    <div className={`media-uploader ${compact ? 'compact' : ''}`}>
      {/* Upload Drop Zone */}
      <div
        ref={dropZoneRef}
        className={`upload-drop-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-content">
          <div className="upload-icon">
            📎
          </div>

          <div className="upload-text">
            <div className="upload-primary-text">
              {isDragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
            </div>
            <div className="upload-secondary-text">
              {acceptedTypes.includes('image/*') && acceptedTypes.includes('video/*')
                ? 'Images and videos'
                : acceptedTypes.includes('image/*')
                ? 'Images'
                : acceptedTypes.includes('video/*')
                ? 'Videos'
                : 'Files'}
              {' '}• Max {maxFileSize}MB each • {getRemainingSlots()} of {maxFiles} remaining
            </div>
          </div>

          {isUploading && (
            <div className="upload-progress">
              <div className="progress-spinner"></div>
              <span>Uploading...</span>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptedTypesString()}
          multiple={multiple && getRemainingSlots() > 1}
          onChange={handleFileInputChange}
          disabled={disabled}
          style={{ display: 'none' }}
          aria-label="Select media files"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <div className="error-title">Upload Error</div>
            <div className="error-details">{error}</div>
          </div>
          <button
            className="error-dismiss"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* File Preview */}
      {showPreview && uploadedFiles.length > 0 && (
        <div className="upload-preview">
          <div className="preview-header">
            <span className="preview-title">
              Selected Files ({uploadedFiles.length}/{maxFiles})
            </span>
            <button
              className="clear-all-button"
              onClick={clearAllFiles}
              disabled={disabled}
              aria-label="Clear all files"
            >
              Clear All
            </button>
          </div>

          <div className="preview-grid">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="preview-item">
                <div className="preview-media">
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="preview-image"
                    />
                  ) : (
                    <video
                      src={file.url}
                      className="preview-video"
                      controls={false}
                      muted
                    />
                  )}

                  <div className="file-type-indicator">
                    {file.type === 'image' ? '🖼️' : '🎥'}
                  </div>
                </div>

                <div className="preview-info">
                  <div className="file-name" title={file.name}>
                    {file.name.length > 20
                      ? `${file.name.substring(0, 20)}...`
                      : file.name}
                  </div>
                  <div className="file-size">
                    {(file.size / (1024 * 1024)).toFixed(1)}MB
                  </div>
                </div>

                <button
                  className="remove-file-button"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Tips */}
      <div className="upload-tips">
        <div className="tip-item">
          <span className="tip-icon">💡</span>
          <span className="tip-text">
            For best results, use high-quality images and keep videos under 30 seconds
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaUploader;
