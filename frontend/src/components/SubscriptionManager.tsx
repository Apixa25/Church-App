import React, { useState, useEffect } from 'react';
import { donationApi, SubscriptionResponse, formatCurrency, formatDate } from '../services/donationApi';
import { DonationCategory, RecurringFrequency, CATEGORY_LABELS, FREQUENCY_LABELS } from '../config/stripe';
import './SubscriptionManager.css';

const SubscriptionManager: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationApi.getSubscriptions();
      setSubscriptions(data);
    } catch (err: any) {
      console.error('Error loading subscriptions:', err);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (subscription: SubscriptionResponse) => {
    if (!window.confirm(`Are you sure you want to cancel your ${subscription.frequencyDisplayName.toLowerCase()} ${subscription.categoryDisplayName} donation of ${formatCurrency(subscription.amount)}?`)) {
      return;
    }

    try {
      setActionLoading(subscription.id);
      await donationApi.cancelSubscription(subscription.stripeSubscriptionId);

      // Update local state
      setSubscriptions(prev =>
        prev.map(sub =>
          sub.id === subscription.id
            ? { ...sub, status: 'CANCELED', statusDisplayName: 'Canceled', canceledAt: new Date().toISOString() }
            : sub
        )
      );

      alert('Subscription canceled successfully.');
    } catch (err: any) {
      console.error('Error canceling subscription:', err);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'canceled':
        return 'status-canceled';
      case 'past_due':
        return 'status-past-due';
      default:
        return 'status-default';
    }
  };

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

  const getTotalMonthlyGiving = (): number => {
    return subscriptions
      .filter(sub => sub.status === 'ACTIVE')
      .reduce((total, sub) => {
        // Convert all frequencies to monthly equivalent
        let monthlyAmount = sub.amount;
        switch (sub.frequency) {
          case RecurringFrequency.WEEKLY:
            monthlyAmount = sub.amount * 4.33; // Average weeks per month
            break;
          case RecurringFrequency.QUARTERLY:
            monthlyAmount = sub.amount / 3;
            break;
          case RecurringFrequency.YEARLY:
            monthlyAmount = sub.amount / 12;
            break;
          default:
            monthlyAmount = sub.amount; // Monthly
        }
        return total + monthlyAmount;
      }, 0);
  };

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'ACTIVE');
  const inactiveSubscriptions = subscriptions.filter(sub => sub.status !== 'ACTIVE');

  if (loading) {
    return (
      <div className="subscription-manager">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-manager">
      <div className="manager-header">
        <h2>Recurring Donations</h2>
        {activeSubscriptions.length > 0 && (
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Active Subscriptions:</span>
              <span className="stat-value">{activeSubscriptions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Monthly Giving:</span>
              <span className="stat-value">{formatCurrency(getTotalMonthlyGiving())}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={loadSubscriptions} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {subscriptions.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">🔄</div>
          <h3>No Recurring Donations</h3>
          <p>
            You don't have any recurring donations set up yet.
            Set up a recurring donation to make a lasting impact on our ministry.
          </p>
          <button
            onClick={() => window.location.href = '/donations'}
            className="btn btn-primary"
          >
            Set Up Recurring Donation
          </button>
        </div>
      ) : (
        <>
          {activeSubscriptions.length > 0 && (
            <div className="subscriptions-section">
              <h3>Active Subscriptions</h3>
              <div className="subscriptions-grid">
                {activeSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onCancel={handleCancelSubscription}
                    getCategoryIcon={getCategoryIcon}
                    getStatusBadgeClass={getStatusBadgeClass}
                    isLoading={actionLoading === subscription.id}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveSubscriptions.length > 0 && (
            <div className="subscriptions-section">
              <h3>Past Subscriptions</h3>
              <div className="subscriptions-grid">
                {inactiveSubscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    onCancel={handleCancelSubscription}
                    getCategoryIcon={getCategoryIcon}
                    getStatusBadgeClass={getStatusBadgeClass}
                    isLoading={false}
                    showActions={false}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Individual Subscription Card Component
interface SubscriptionCardProps {
  subscription: SubscriptionResponse;
  onCancel: (subscription: SubscriptionResponse) => void;
  getCategoryIcon: (category: DonationCategory) => string;
  getStatusBadgeClass: (status: string) => string;
  isLoading: boolean;
  showActions?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  onCancel,
  getCategoryIcon,
  getStatusBadgeClass,
  isLoading,
  showActions = true,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getNextPaymentText = (): string => {
    if (!subscription.nextPaymentDate) return 'Unknown';

    const nextDate = new Date(subscription.nextPaymentDate);
    const now = new Date();
    const diffTime = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;

    return formatDate(subscription.nextPaymentDate);
  };

  return (
    <div className={`subscription-card ${subscription.status.toLowerCase()}`}>
      <div className="card-header">
        <div className="subscription-info">
          <div className="subscription-icon">
            {getCategoryIcon(subscription.category)}
          </div>
          <div className="subscription-details">
            <div className="amount-frequency">
              <span className="amount">{formatCurrency(subscription.amount)}</span>
              <span className="frequency">/ {subscription.frequencyDisplayName.toLowerCase()}</span>
            </div>
            <div className="category">{subscription.categoryDisplayName}</div>
            {subscription.purpose && (
              <div className="purpose">{subscription.purpose}</div>
            )}
          </div>
        </div>

        <div className="card-status">
          <span className={`status-badge ${getStatusBadgeClass(subscription.status)}`}>
            {subscription.statusDisplayName}
          </span>
        </div>
      </div>

      <div className="card-summary">
        <div className="summary-item">
          <span className="summary-label">Total Given:</span>
          <span className="summary-value">{formatCurrency(subscription.totalDonationsAmount)}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Donations:</span>
          <span className="summary-value">{subscription.totalDonationsCount}</span>
        </div>
        {subscription.status === 'ACTIVE' && subscription.nextPaymentDate && (
          <div className="summary-item">
            <span className="summary-label">Next Payment:</span>
            <span className="summary-value">{getNextPaymentText()}</span>
          </div>
        )}
      </div>

      {subscription.failureCount > 0 && (
        <div className="failure-warning">
          <span className="warning-icon">⚠️</span>
          <span>
            {subscription.failureCount} recent payment failure{subscription.failureCount > 1 ? 's' : ''}
          </span>
          {subscription.lastFailureReason && (
            <span className="failure-reason">: {subscription.lastFailureReason}</span>
          )}
        </div>
      )}

      <div className="card-actions">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn-outline btn-small"
        >
          {showDetails ? 'Hide Details' : 'View Details'}
        </button>

        {showActions && subscription.status === 'ACTIVE' && (
          <button
            onClick={() => onCancel(subscription)}
            disabled={isLoading}
            className="btn btn-danger btn-small"
          >
            {isLoading ? (
              <span className="loading-text">
                <span className="spinner-small"></span>
                Canceling...
              </span>
            ) : (
              'Cancel Subscription'
            )}
          </button>
        )}
      </div>

      {showDetails && (
        <div className="card-details-expanded">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Started:</span>
              <span className="detail-value">
                {formatDate(subscription.startedAt || subscription.createdAt)}
              </span>
            </div>

            {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
              <div className="detail-item">
                <span className="detail-label">Current Period:</span>
                <span className="detail-value">
                  {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            )}

            {subscription.paymentMethodBrand && subscription.paymentMethodLast4 && (
              <div className="detail-item">
                <span className="detail-label">Payment Method:</span>
                <span className="detail-value">
                  {subscription.paymentMethodBrand.charAt(0).toUpperCase() + subscription.paymentMethodBrand.slice(1)}
                  ending in {subscription.paymentMethodLast4}
                </span>
              </div>
            )}

            {subscription.canceledAt && (
              <div className="detail-item">
                <span className="detail-label">Canceled:</span>
                <span className="detail-value">{formatDate(subscription.canceledAt)}</span>
              </div>
            )}

            {subscription.endedAt && (
              <div className="detail-item">
                <span className="detail-label">Ended:</span>
                <span className="detail-value">{formatDate(subscription.endedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;