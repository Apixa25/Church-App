import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  PrayerRequestCreateRequest, 
  PrayerRequestUpdateRequest, 
  PrayerRequest,
  PrayerCategory,
  PrayerStatus,
  PRAYER_CATEGORY_LABELS,
  PRAYER_CATEGORY_COLORS,
  PRAYER_STATUS_LABELS,
} from '../types/Prayer';
import { prayerAPI, handleApiError } from '../services/prayerApi';

interface PrayerRequestFormProps {
  existingPrayer?: PrayerRequest;
  onSuccess?: (prayer: PrayerRequest) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
}

interface PrayerFormData {
  title: string;
  description: string;
  isAnonymous: boolean;
  category: PrayerCategory;
  status?: PrayerStatus;
}

const PrayerRequestForm: React.FC<PrayerRequestFormProps> = ({
  existingPrayer,
  onSuccess,
  onCancel,
  mode = 'create'
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<PrayerFormData>({
    defaultValues: {
      title: existingPrayer?.title || '',
      description: existingPrayer?.description || '',
      isAnonymous: existingPrayer?.isAnonymous || false,
      category: existingPrayer?.category || 'GENERAL',
      status: existingPrayer?.status || 'ACTIVE'
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const watchedCategory = watch('category');

  useEffect(() => {
    if (existingPrayer) {
      reset({
        title: existingPrayer.title,
        description: existingPrayer.description || '',
        isAnonymous: existingPrayer.isAnonymous,
        category: existingPrayer.category,
        status: existingPrayer.status
      });
    }
  }, [existingPrayer, reset]);

  const onSubmit = async (data: PrayerFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let response;
      
      if (mode === 'edit' && existingPrayer) {
        const updateRequest: PrayerRequestUpdateRequest = {
          title: data.title,
          description: data.description || undefined,
          isAnonymous: data.isAnonymous,
          category: data.category,
          status: data.status
        };
        response = await prayerAPI.updatePrayerRequest(existingPrayer.id, updateRequest);
      } else {
        const createRequest: PrayerRequestCreateRequest = {
          title: data.title,
          description: data.description || undefined,
          isAnonymous: data.isAnonymous,
          category: data.category
        };
        response = await prayerAPI.createPrayerRequest(createRequest);
      }

      const prayer = response.data;
      setSuccess(mode === 'edit' ? 'Prayer request updated successfully!' : 'Prayer request created successfully!');
      
      if (onSuccess) {
        onSuccess(prayer);
      }

      // Reset form if creating new prayer
      if (mode === 'create') {
        reset();
      }
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="prayer-request-form">
      <div className="form-header">
        <h2>{mode === 'edit' ? 'Edit Prayer Request' : 'Submit a Prayer Request'}</h2>
        <p className="form-description">
          Share your prayer needs with the church community. Your request will be treated with care and respect.
        </p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="prayer-form">
        <div className="form-group">
          <label htmlFor="title" className="form-label required">
            Prayer Title
          </label>
          <input
            type="text"
            id="title"
            className={`form-input ${errors.title ? 'error' : ''}`}
            placeholder="Brief description of your prayer request..."
            {...register('title', {
              required: 'Prayer title is required',
              minLength: {
                value: 3,
                message: 'Title must be at least 3 characters'
              },
              maxLength: {
                value: 200,
                message: 'Title cannot exceed 200 characters'
              }
            })}
          />
          {errors.title && (
            <span className="error-text">{errors.title.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Details (Optional)
          </label>
          <textarea
            id="description"
            className={`form-textarea ${errors.description ? 'error' : ''}`}
            placeholder="Additional details about your prayer request..."
            rows={4}
            {...register('description', {
              maxLength: {
                value: 2000,
                message: 'Description cannot exceed 2000 characters'
              }
            })}
          />
          {errors.description && (
            <span className="error-text">{errors.description.message}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="category" className="form-label">
            Category
          </label>
          <select
            id="category"
            className="form-select"
            style={{ borderColor: PRAYER_CATEGORY_COLORS[watchedCategory] }}
            {...register('category')}
          >
            {Object.entries(PRAYER_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {mode === 'edit' && (
          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              className="form-select"
              {...register('status')}
            >
              {Object.entries(PRAYER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <small className="form-help">
              Mark your prayer as "Answered" when God has answered it, or "Resolved" when the situation is resolved.
            </small>
          </div>
        )}

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="form-checkbox"
              {...register('isAnonymous')}
            />
            <span className="checkbox-text">
              <strong>Post anonymously</strong>
              <br />
              <small>Your name will not be shown to other members</small>
            </span>
          </label>
        </div>

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                {mode === 'edit' ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              mode === 'edit' ? 'Update Prayer' : 'Submit Prayer'
            )}
          </button>
        </div>
      </form>

      <style>{`
        .prayer-request-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-header h2 {
          color: #2c3e50;
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          font-weight: 600;
        }

        .form-description {
          color: #7f8c8d;
          margin: 0;
          line-height: 1.5;
        }

        .error-message, .success-message {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .success-message {
          background-color: #efe;
          border: 1px solid #cfc;
          color: #363;
        }

        .prayer-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 0.95rem;
        }

        .form-label.required::after {
          content: ' *';
          color: #e74c3c;
        }

        .form-input, .form-textarea, .form-select {
          padding: 0.75rem;
          border: 2px solid #e1e8ed;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s ease;
          background: white;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          border-color: #3498db;
        }

        .form-input.error, .form-textarea.error {
          border-color: #e74c3c;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-help {
          font-size: 0.85rem;
          color: #7f8c8d;
          margin-top: 0.25rem;
          font-style: italic;
        }

        .checkbox-group {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          border: 2px solid #e9ecef;
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
        }

        .form-checkbox {
          margin-top: 0.2rem;
          width: 1.2rem;
          height: 1.2rem;
          cursor: pointer;
        }

        .checkbox-text {
          flex: 1;
          line-height: 1.4;
        }

        .checkbox-text small {
          color: #6c757d;
          font-size: 0.85rem;
        }

        .error-text {
          color: #e74c3c;
          font-size: 0.85rem;
          margin-top: -0.25rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e1e8ed;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background-color: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #2980b9;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background-color: #95a5a6;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background-color: #7f8c8d;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .prayer-request-form {
            padding: 1.5rem;
            margin: 1rem;
          }

          .form-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default PrayerRequestForm;