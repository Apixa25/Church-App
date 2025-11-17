import React, { useState } from 'react';
import './AccountDeletionModal.css';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string, reason: string) => Promise<void>;
  userName?: string;
}

const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userName
}) => {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Password is required to confirm account deletion');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSubmit(password, reason);
      // Don't close modal here - parent will handle success and logout
      // Modal will be closed by parent after showing success message
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || err.response?.data?.error;
      
      if (errorMessage?.toLowerCase().includes('password')) {
        setError('Invalid password. Please check your password and try again.');
      } else if (errorMessage?.toLowerCase().includes('already exists')) {
        setError('You already have a pending deletion request. Please check your email for the confirmation link.');
      } else {
        setError(errorMessage || 'Failed to submit deletion request. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setPassword('');
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content account-deletion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🗑️ Delete Account</h2>
          <button 
            className="modal-close-btn" 
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="deletion-form">
          <div className="form-section">
            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-content">
                <p className="warning-title">This action cannot be undone</p>
                <p className="warning-text">
                  Deleting your account will permanently remove all your data, including:
                </p>
                <ul className="warning-list">
                  <li>Your profile and personal information</li>
                  <li>All your posts, comments, and interactions</li>
                  <li>Your prayer requests and responses</li>
                  <li>All chat messages and groups</li>
                  <li>Event RSVPs and preferences</li>
                  <li>Your account settings and preferences</li>
                </ul>
                <p className="warning-note">
                  You will receive a confirmation email. Your account will be permanently deleted after a 7-day grace period.
                </p>
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label" htmlFor="password">
              Enter your password to confirm *
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label" htmlFor="reason">
              Why are you leaving? (Optional)
            </label>
            <textarea
              id="reason"
              className="form-textarea"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Help us improve by sharing your reason..."
              rows={4}
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="char-count">{reason.length}/500</div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
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
              className="btn-danger"
              disabled={isSubmitting || !password.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Request Account Deletion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountDeletionModal;

