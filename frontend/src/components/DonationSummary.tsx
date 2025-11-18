import React from 'react';
import { DonationCategory, RecurringFrequency, CATEGORY_LABELS, FREQUENCY_LABELS } from '../config/stripe';
import { formatCurrency } from '../services/donationApi';
import './DonationSummary.css';

interface DonationSummaryProps {
  amount: number;
  category: DonationCategory;
  purpose?: string;
  isRecurring: boolean;
  frequency?: RecurringFrequency;
}

const DonationSummary: React.FC<DonationSummaryProps> = ({
  amount,
  category,
  purpose,
  isRecurring,
  frequency,
}) => {
  const estimatedFee = Math.round((amount * 0.029 + 0.30) * 100) / 100;
  const netAmount = amount - estimatedFee;

  const getCategoryIcon = (category: DonationCategory): string => {
    switch (category) {
      case DonationCategory.TITHES:
        return '💝';
      case DonationCategory.OFFERINGS:
        return '🙏';
      case DonationCategory.MISSIONS:
        return '🌍';
      default:
        return '💖';
    }
  };

  const getFrequencyDescription = (frequency: RecurringFrequency): string => {
    switch (frequency) {
      case RecurringFrequency.WEEKLY:
        return 'every week';
      case RecurringFrequency.MONTHLY:
        return 'every month';
      case RecurringFrequency.QUARTERLY:
        return 'every 3 months';
      case RecurringFrequency.YEARLY:
        return 'every year';
      default:
        return '';
    }
  };

  return (
    <div className="donation-summary">
      <div className="summary-header">
        <h3>Donation Summary</h3>
        <p>Please review your donation details before completing payment</p>
      </div>

      <div className="summary-card">
        <div className="donation-type">
          {isRecurring ? (
            <div className="recurring-badge">
              <span className="badge-icon">🔄</span>
              <span>Recurring Donation</span>
            </div>
          ) : (
            <div className="one-time-badge">
              <span className="badge-icon">💫</span>
              <span>One-Time Donation</span>
            </div>
          )}
        </div>

        <div className="amount-section">
          <div className="main-amount">
            <span className="currency">$</span>
            <span className="amount">{amount.toFixed(2)}</span>
          </div>
          {isRecurring && frequency && (
            <div className="frequency-text">
              {getFrequencyDescription(frequency)}
            </div>
          )}
        </div>

        <div className="details-section">
          <div className="detail-row">
            <span className="detail-label">
              <span className="detail-icon">{getCategoryIcon(category)}</span>
              Category
            </span>
            <span className="detail-value">{CATEGORY_LABELS[category]}</span>
          </div>

          {purpose && purpose.trim() && (
            <div className="detail-row">
              <span className="detail-label">
                <span className="detail-icon">📝</span>
                Purpose
              </span>
              <span className="detail-value">{purpose}</span>
            </div>
          )}

          <div className="fee-breakdown">
            <div className="fee-row">
              <span className="fee-label">Processing Fee</span>
              <span className="fee-value">~{formatCurrency(estimatedFee)}</span>
            </div>
            <div className="fee-row total">
              <span className="fee-label">Amount to Church</span>
              <span className="fee-value">{formatCurrency(netAmount)}</span>
            </div>
          </div>
        </div>

        {isRecurring && (
          <div className="recurring-info">
            <div className="info-icon">ℹ️</div>
            <div className="info-text">
              <p>Your card will be charged automatically {frequency && getFrequencyDescription(frequency)}.</p>
              <p>You can cancel or modify this recurring donation anytime from your profile.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default DonationSummary;