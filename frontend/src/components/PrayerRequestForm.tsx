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
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          box-shadow: var(--shadow-md);
        }

        .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-header h2 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          font-weight: 600;
        }

        .form-description {
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .error-message, .success-message {
          padding: 1rem;
          border-radius: var(--border-radius-md);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .error-message {
          background-color: rgba(239, 68, 68, 0.2);
          border: 1px solid var(--error);
          color: var(--error);
        }

        .success-message {
          background-color: rgba(16, 185, 129, 0.2);
          border: 1px solid var(--success);
          color: var(--success);
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
          color: var(--text-primary);
          font-size: 0.95rem;
        }

        .form-label.required::after {
          content: ' *';
          color: var(--error);
        }

        .form-input, .form-textarea, .form-select {
          padding: 0.75rem;
          background: var(--bg-secondary);
          border: 2px solid var(--border-primary);
          border-radius: var(--border-radius-md);
          font-size: 1rem;
          color: var(--text-primary);
          transition: all var(--transition-base);
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
          background: var(--bg-tertiary);
        }

        .form-input.error, .form-textarea.error {
          border-color: var(--error);
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-help {
          font-size: 0.85rem;
          color: var(--text-tertiary);
          margin-top: 0.25rem;
          font-style: italic;
        }

        .checkbox-group {
          background: var(--bg-secondary);
          padding: 1rem;
          border-radius: var(--border-radius-md);
          border: 2px solid var(--border-primary);
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
          color: var(--text-secondary);
        }

        .checkbox-text small {
          color: var(--text-tertiary);
          font-size: 0.85rem;
        }

        .error-text {
          color: var(--error);
          font-size: 0.85rem;
          margin-top: -0.25rem;
        }

        .form-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-primary);
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--border-radius-md);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: var(--accent-primary);
          color: white;
          box-shadow: 0 2px 8px var(--button-primary-glow);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--accent-primary-dark);
          transform: translateY(-1px);
          box-shadow: var(--glow-blue);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          border: 1px solid var(--border-primary);
          color: var(--text-secondary);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-tertiary);
          border-color: var(--border-glow);
          color: var(--text-primary);
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