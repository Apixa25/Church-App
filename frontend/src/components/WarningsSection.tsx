import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMyWarnings } from '../services/postApi';
import './WarningsSection.css';

interface UserWarning {
  id: string;
  reason: string;
  message?: string;
  contentType?: string;
  contentId?: string;
  moderatorName: string;
  createdAt: string;
}

interface WarningsSectionProps {
  onClose?: () => void;
}

const WarningsSection: React.FC<WarningsSectionProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [warnings, setWarnings] = useState<UserWarning[]>([]);
  const [totalWarningCount, setTotalWarningCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadWarnings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError('');
        const response = await getMyWarnings();
        setWarnings(response.warnings || []);
        setTotalWarningCount(response.totalWarningCount || response.warningCount || 0);
      } catch (err: any) {
        console.error('Error loading warnings:', err);
        setError('Failed to load warnings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWarnings();
  }, [user]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasonMap: Record<string, string> = {
      'SPAM': 'Spam',
      'HARASSMENT': 'Harassment',
      'HATE_SPEECH': 'Hate Speech',
      'INAPPROPRIATE': 'Inappropriate Content',
      'COPYRIGHT': 'Copyright Violation',
      'OTHER': 'Other Violation',
      'CONTENT_VIOLATION': 'Content Violation'
    };
    return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="warnings-section">
        <div className="warnings-loading">Loading warnings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="warnings-section">
        <div className="warnings-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="warnings-section">
      <div className="warnings-header">
        <div className="warnings-title">
          <span className="warnings-icon">⚠️</span>
          <h3>Warnings</h3>
          {totalWarningCount > 0 && (
            <span className="warnings-count-badge">{totalWarningCount}</span>
          )}
        </div>
        {onClose && (
          <button className="warnings-close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <div className="warnings-info">
        {totalWarningCount >= 3 ? (
          <div className="warnings-alert critical">
            <strong>⚠️ Critical:</strong> You have {totalWarningCount} warnings. Your account may be restricted. 
            Please review our community guidelines carefully.
          </div>
        ) : totalWarningCount >= 2 ? (
          <div className="warnings-alert warning">
            <strong>⚠️ Warning:</strong> You have {totalWarningCount} warnings. One more violation may result in account restrictions.
          </div>
        ) : totalWarningCount === 1 ? (
          <div className="warnings-alert info">
            <strong>ℹ️ Notice:</strong> You have 1 warning. Please review our community guidelines.
          </div>
        ) : (
          <div className="warnings-alert success">
            <strong>✓ Good Standing:</strong> You have no warnings. Keep up the great work!
          </div>
        )}
      </div>

      {warnings.length === 0 ? (
        <div className="warnings-empty">
          <div className="warnings-empty-icon">✅</div>
          <p>No warnings on your account</p>
          <span>Continue following our community guidelines to maintain your good standing.</span>
        </div>
      ) : (
        <div className="warnings-list">
          {warnings.map((warning) => (
            <div key={warning.id} className="warning-item">
              <div className="warning-item-header">
                <div className="warning-item-reason">
                  <span className="warning-reason-badge">{getReasonLabel(warning.reason)}</span>
                  {warning.contentType && (
                    <span className="warning-content-type">
                      Related to: {warning.contentType}
                    </span>
                  )}
                </div>
                <div className="warning-item-date">
                  {formatDate(warning.createdAt)}
                </div>
              </div>
              
              {warning.message && (
                <div className="warning-item-message">
                  {warning.message}
                </div>
              )}

              <div className="warning-item-footer">
                <span className="warning-moderator">
                  Issued by: {warning.moderatorName || 'System'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="warnings-footer">
        <p>
          <strong>Need help?</strong> If you believe a warning was issued in error, 
          please contact support or review our{' '}
          <a href="/community-guidelines" target="_blank" rel="noopener noreferrer">
            Community Guidelines
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default WarningsSection;

