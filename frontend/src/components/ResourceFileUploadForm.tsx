import React, { useState, useRef, useCallback } from 'react';
import { resourceAPI, buildResourceFormData } from '../services/resourceApi';
import { Resource, ResourceCategory, getResourceCategoryLabel, formatFileSize, getFileIconByType } from '../types/Resource';
import './ResourceFileUploadForm.css';

interface ResourceFileUploadFormProps {
  resource?: Resource;
  onSuccess: (resource: Resource) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const ResourceFileUploadForm: React.FC<ResourceFileUploadFormProps> = ({
  resource,
  onSuccess,
  onCancel,
  onError,
}) => {
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    description: resource?.description || '',
    category: resource?.category || ResourceCategory.GENERAL,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidation, setFileValidation] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!resource;
  const isFileUpdate = isEditing && resource?.fileUrl;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title cannot exceed 200 characters';
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    if (!selectedFile && !isFileUpdate) {
      newErrors.file = 'Please select a file to upload';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateFile = useCallback(async (file: File) => {
    try {
      const response = await resourceAPI.validateFile(file);
      setFileValidation(response.data);
      
      if (!response.data.valid) {
        setErrors(prev => ({ ...prev, file: response.data.error || 'Invalid file' }));
        return false;
      }
      
      // Auto-suggest category if not set or if suggested category is more specific
      if (formData.category === ResourceCategory.GENERAL || !formData.category) {
        setFormData(prev => ({
          ...prev,
          category: response.data.suggestedCategory || ResourceCategory.GENERAL
        }));
      }
      
      // Clear file error
      setErrors(prev => ({ ...prev, file: '' }));
      return true;
    } catch (error: any) {
      console.error('Error validating file:', error);
      setErrors(prev => ({ ...prev, file: 'Failed to validate file' }));
      return false;
    }
  }, [formData.category]);

  const handleFileChange = useCallback(async (file: File) => {
    setSelectedFile(file);
    setFileValidation(null);
    await validateFile(file);
  }, [validateFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  }, [handleFileChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const removeFile = () => {
    setSelectedFile(null);
    setFileValidation(null);
    setErrors(prev => ({ ...prev, file: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (selectedFile && !fileValidation?.valid) {
      onError('Please wait for file validation to complete');
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      let response;
      
      if (isFileUpdate && selectedFile) {
        // Update existing resource's file
        const fileFormData = new FormData();
        fileFormData.append('file', selectedFile);
        response = await resourceAPI.updateResourceFile(resource!.id, fileFormData);
      } else if (selectedFile) {
        // Create new resource with file
        const fileFormData = buildResourceFormData(
          formData.title.trim(),
          formData.description.trim(),
          formData.category,
          selectedFile
        );
        response = await resourceAPI.createResourceWithFile(fileFormData);
      } else {
        throw new Error('No file selected');
      }

      onSuccess(response.data);
    } catch (error: any) {
      console.error('Error uploading resource with file:', error);
      onError(error.response?.data?.error || `Failed to ${isFileUpdate ? 'update file' : 'upload resource'}`);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | ResourceCategory) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="resource-file-upload-container">
      <div className="resource-file-upload-header">
        <h2>
          {isFileUpdate ? '📁 Update Resource File' : '📁 Upload Resource with File'}
        </h2>
        <p>
          {isFileUpdate 
            ? 'Replace the current file for this resource'
            : 'Share a file-based resource with the community'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="resource-file-upload-form">
        {/* File Upload Area */}
        <div className="form-group">
          <label className="form-label">
            File Upload *
          </label>
          
          <div
            className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${errors.file ? 'error' : ''}`}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="file-input-hidden"
              disabled={loading}
            />
            
            {selectedFile ? (
              <div className="file-selected">
                <div className="file-info">
                  <span className="file-icon">
                    {getFileIconByType(selectedFile.type)}
                  </span>
                  <div className="file-details">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                    {fileValidation && (
                      <div className={`file-status ${fileValidation.valid ? 'valid' : 'invalid'}`}>
                        {fileValidation.valid ? '✅ Valid file' : '❌ Invalid file'}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="remove-file-btn"
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="file-drop-content">
                <div className="drop-icon">📁</div>
                <div className="drop-text">
                  <strong>Click to select</strong> or drag and drop your file here
                </div>
                <div className="drop-hint">
                  Supports: Images, Videos, Audio, PDFs, Word docs, Text files
                </div>
                <div className="file-size-limit">
                  Maximum file size: 150MB
                </div>
              </div>
            )}
          </div>
          
          {errors.file && <span className="error-text">{errors.file}</span>}
        </div>

        {!isFileUpdate && (
          <>
            {/* Title Field */}
            <div className="form-group">
              <label htmlFor="title" className="form-label">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className={`form-input ${errors.title ? 'error' : ''}`}
                placeholder="Enter resource title..."
                maxLength={200}
                disabled={loading}
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
              <span className="character-count">
                {formData.title.length}/200
              </span>
            </div>

            {/* Category Field */}
            <div className="form-group">
              <label htmlFor="category" className="form-label">
                Category *
                {fileValidation?.suggestedCategory && (
                  <span className="category-suggestion">
                    (Suggested: {getResourceCategoryLabel(fileValidation.suggestedCategory)})
                  </span>
                )}
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value as ResourceCategory)}
                className="form-select"
                disabled={loading}
              >
                {Object.values(ResourceCategory).map((category) => (
                  <option key={category} value={category}>
                    {getResourceCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Field */}
            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="Provide a detailed description of the resource..."
                rows={4}
                maxLength={2000}
                disabled={loading}
              />
              {errors.description && <span className="error-text">{errors.description}</span>}
              <span className="character-count">
                {formData.description.length}/2000
              </span>
            </div>
          </>
        )}

        {/* Progress Bar */}
        {loading && uploadProgress > 0 && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !selectedFile || (selectedFile && !fileValidation?.valid)}
          >
            {loading ? (
              <>
                <span className="loading-spinner-sm"></span>
                {isFileUpdate ? 'Updating...' : 'Uploading...'}
              </>
            ) : (
              isFileUpdate ? 'Update File' : 'Upload Resource'
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="info-box">
        <h4>📁 File Upload Tips</h4>
        <ul>
          <li>Drag and drop files or click to browse</li>
          <li>Supported: Images, videos, audio, PDFs, Word docs, text files</li>
          <li>Maximum file size: 150MB</li>
          <li>Files are automatically categorized based on type</li>
          <li>All uploads require approval before becoming public</li>
        </ul>
      </div>
    </div>
  );
};

export default ResourceFileUploadForm;