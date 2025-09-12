import React, { useState, useEffect } from 'react';
import { resourceAPI } from '../services/resourceApi';
import { Resource, ResourceCategory, ResourceRequest, getResourceCategoryLabel } from '../types/Resource';
import './ResourceForm.css';

interface ResourceFormProps {
  resource?: Resource;
  onSuccess: (resource: Resource) => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

const ResourceForm: React.FC<ResourceFormProps> = ({
  resource,
  onSuccess,
  onCancel,
  onError,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ResourceCategory.GENERAL,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!resource;

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title,
        description: resource.description || '',
        category: resource.category,
      });
    }
  }, [resource]);

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const resourceRequest: ResourceRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
      };

      let response;
      if (isEditing && resource) {
        response = await resourceAPI.updateResource(resource.id, resourceRequest);
      } else {
        response = await resourceAPI.createResource(resourceRequest);
      }

      onSuccess(response.data);
    } catch (error: any) {
      console.error('Error saving resource:', error);
      onError(error.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} resource`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | ResourceCategory) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="resource-form-container">
      <div className="resource-form-header">
        <h2>
          {isEditing ? '✏️ Edit Resource' : '➕ Add New Resource'}
        </h2>
        <p>
          {isEditing 
            ? 'Update your resource information' 
            : 'Share a text-based resource with the community'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="resource-form">
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
            rows={6}
            maxLength={2000}
            disabled={loading}
          />
          {errors.description && <span className="error-text">{errors.description}</span>}
          <span className="character-count">
            {formData.description.length}/2000
          </span>
        </div>

        {/* File Info (if editing existing resource with file) */}
        {isEditing && resource?.fileUrl && (
          <div className="form-group">
            <label className="form-label">Current File</label>
            <div className="current-file-info">
              <div className="file-details">
                <span className="file-icon">
                  {resource.fileType?.startsWith('image/') ? '🖼️' : 
                   resource.fileType?.startsWith('video/') ? '🎥' :
                   resource.fileType?.startsWith('audio/') ? '🎵' : '📄'}
                </span>
                <div className="file-text">
                  <div className="file-name">{resource.fileName}</div>
                  {resource.fileSize && (
                    <div className="file-size">
                      {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </div>
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-primary"
              >
                View File
              </a>
            </div>
            <p className="form-help-text">
              💡 To update the file, use the file upload form instead.
            </p>
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
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner-sm"></span>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              isEditing ? 'Update Resource' : 'Create Resource'
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="info-box">
        <h4>📝 Text-Only Resources</h4>
        <ul>
          <li>Perfect for quotes, verses, study guides, or announcements</li>
          <li>Resources require approval before appearing publicly</li>
          <li>Admin and moderator uploads are automatically approved</li>
          <li>You can upload files later using the file upload form</li>
        </ul>
      </div>
    </div>
  );
};

export default ResourceForm;