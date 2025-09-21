import React from 'react';
import { DonationCategory, RecurringFrequency, CATEGORY_LABELS, FREQUENCY_LABELS } from '../config/stripe';
import { formatCurrency } from '../services/donationApi';

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

      <style jsx>{`
        .donation-summary {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .summary-header h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.4rem;
        }

        .summary-header p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .summary-card {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .donation-type {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .recurring-badge,
        .one-time-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .recurring-badge {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
        }

        .one-time-badge {
          background: linear-gradient(135deg, #4682b4, #5a9bd3);
          color: white;
        }

        .badge-icon {
          font-size: 1rem;
        }

        .amount-section {
          text-align: center;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .main-amount {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.25rem;
        }

        .currency {
          font-size: 1.5rem;
          font-weight: 600;
          color: #4682b4;
        }

        .amount {
          font-size: 3rem;
          font-weight: 700;
          color: #4682b4;
          line-height: 1;
        }

        .frequency-text {
          margin-top: 0.5rem;
          font-size: 1.1rem;
          color: #666;
          font-weight: 500;
        }

        .details-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e9ecef;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #666;
        }

        .detail-icon {
          font-size: 1.1rem;
        }

        .detail-value {
          font-weight: 600;
          color: #333;
          text-align: right;
        }

        .fee-breakdown {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .fee-row:last-child {
          margin-bottom: 0;
        }

        .fee-row.total {
          padding-top: 0.5rem;
          border-top: 1px solid #dee2e6;
          font-weight: 600;
        }

        .fee-label {
          font-size: 0.9rem;
          color: #666;
        }

        .fee-value {
          font-size: 0.9rem;
          color: #333;
        }

        .fee-row.total .fee-label,
        .fee-row.total .fee-value {
          font-weight: 600;
          color: #4682b4;
        }

        .recurring-info {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          padding: 1rem;
          background: #e3f2fd;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        }

        .info-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .info-text {
          flex: 1;
        }

        .info-text p {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
          color: #666;
          line-height: 1.4;
        }

        .info-text p:last-child {
          margin-bottom: 0;
        }

        @media (max-width: 768px) {
          .donation-summary {
            padding: 1rem;
          }

          .summary-card {
            padding: 1rem;
          }

          .amount {
            font-size: 2.5rem;
          }

          .currency {
            font-size: 1.2rem;
          }

          .detail-value {
            max-width: 60%;
            word-break: break-word;
          }

          .recurring-info {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DonationSummary;