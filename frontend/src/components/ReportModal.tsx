import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ReportModal.css';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => Promise<void>;
  contentType: 'POST' | 'USER';
  contentName?: string;
}

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam or misleading content' },
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'HATE_SPEECH', label: 'Hate speech or discrimination' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
  { value: 'COPYRIGHT', label: 'Copyright violation' },
  { value: 'OTHER', label: 'Other' }
];

const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  contentType,
  contentName
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position and prevent scrolling
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(selectedReason, description);
      // Reset form and close
      setSelectedReason('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setDescription('');
      setError('');
      onClose();
    }
  };

  const modalContent = (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report {contentType === 'POST' ? 'Post' : 'User'}</h2>
          <button 
            className="modal-close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-section">
            <p className="report-description">
              Help us understand the problem. Your report is anonymous and will be reviewed by our moderation team.
            </p>
            {contentName && (
              <p className="report-target">
                Reporting: <strong>{contentName}</strong>
              </p>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Reason for reporting *</label>
            <div className="reason-options">
              {REPORT_REASONS.map((reason) => (
                <label key={reason.value} className="reason-option">
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label" htmlFor="description">
              Additional details (optional)
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context that might help us understand the issue..."
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="char-count">{description.length}/500</div>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting || !selectedReason}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!isOpen) return null;

  // Use portal to render modal directly to document.body, ensuring it's always on top
  return createPortal(modalContent, document.body);
};

export default ReportModal;

