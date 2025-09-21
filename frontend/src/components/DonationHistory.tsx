import React, { useState, useEffect } from 'react';
import { donationApi, DonationResponse, formatCurrency, formatDate, downloadReceiptFile } from '../services/donationApi';
import { DonationCategory, CATEGORY_LABELS } from '../config/stripe';
import './DonationHistory.css';

interface DonationHistoryProps {
  userId?: string;
  showFilters?: boolean;
  maxItems?: number;
}

interface FilterState {
  category: DonationCategory | 'all';
  dateRange: 'all' | '30days' | '90days' | '1year';
  searchTerm: string;
}

const DonationHistory: React.FC<DonationHistoryProps> = ({
  userId,
  showFilters = true,
  maxItems,
}) => {
  const [donations, setDonations] = useState<DonationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    dateRange: 'all',
    searchTerm: '',
  });

  const PAGE_SIZE = maxItems || 10;

  useEffect(() => {
    loadDonations();
  }, [currentPage, filters]);

  const loadDonations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await donationApi.getDonationHistory(currentPage, PAGE_SIZE);

      let filteredDonations = response.content;

      // Apply filters
      if (filters.category !== 'all') {
        filteredDonations = filteredDonations.filter(d => d.category === filters.category);
      }

      if (filters.dateRange !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();

        switch (filters.dateRange) {
          case '30days':
            cutoffDate.setDate(now.getDate() - 30);
            break;
          case '90days':
            cutoffDate.setDate(now.getDate() - 90);
            break;
          case '1year':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        filteredDonations = filteredDonations.filter(d =>
          new Date(d.timestamp) >= cutoffDate
        );
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredDonations = filteredDonations.filter(d =>
          d.transactionId.toLowerCase().includes(searchLower) ||
          d.categoryDisplayName.toLowerCase().includes(searchLower) ||
          (d.purpose && d.purpose.toLowerCase().includes(searchLower))
        );
      }

      setDonations(filteredDonations);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);

    } catch (err: any) {
      console.error('Error loading donations:', err);
      setError('Failed to load donation history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (donation: DonationResponse) => {
    try {
      const filename = `Receipt_${formatDate(donation.timestamp).replace(/[^\w\-_\.]/g, '_')}_${donation.transactionId}.pdf`;
      await downloadReceiptFile(donation.id, filename);
    } catch (err) {
      console.error('Error downloading receipt:', err);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const handleResendReceipt = async (donation: DonationResponse) => {
    try {
      await donationApi.resendReceipt(donation.id);
      alert('Receipt has been resent to your email address.');
    } catch (err) {
      console.error('Error resending receipt:', err);
      alert('Failed to resend receipt. Please try again.');
    }
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0); // Reset to first page when filtering
  };

  const getTotalDonated = (): number => {
    return donations.reduce((total, donation) => total + donation.amount, 0);
  };

  const getDonationIcon = (category: DonationCategory): string => {
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

  if (loading && donations.length === 0) {
    return (
      <div className="donation-history">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading your donation history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-history">
      <div className="history-header">
        <h2>Donation History</h2>
        {donations.length > 0 && (
          <div className="history-stats">
            <div className="stat-item">
              <span className="stat-label">Total Donations:</span>
              <span className="stat-value">{donations.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Given:</span>
              <span className="stat-value">{formatCurrency(getTotalDonated())}</span>
            </div>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="category-filter">Category:</label>
            <select
              id="category-filter"
              value={filters.category}
              onChange={(e) => updateFilter('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="date-filter">Date Range:</label>
            <select
              id="date-filter"
              value={filters.dateRange}
              onChange={(e) => updateFilter('dateRange', e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="1year">Last Year</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="search-filter">Search:</label>
            <input
              id="search-filter"
              type="text"
              placeholder="Search transactions..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={loadDonations} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {donations.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">💝</div>
          <h3>No Donations Found</h3>
          <p>
            {filters.category !== 'all' || filters.dateRange !== 'all' || filters.searchTerm
              ? 'No donations match your current filters. Try adjusting your search criteria.'
              : 'You haven\'t made any donations yet. Start giving today to support our mission.'}
          </p>
          {(filters.category !== 'all' || filters.dateRange !== 'all' || filters.searchTerm) && (
            <button
              onClick={() => setFilters({ category: 'all', dateRange: 'all', searchTerm: '' })}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="donations-list">
            {donations.map((donation) => (
              <DonationCard
                key={donation.id}
                donation={donation}
                onDownloadReceipt={handleDownloadReceipt}
                onResendReceipt={handleResendReceipt}
                getDonationIcon={getDonationIcon}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="pagination-btn"
              >
                ← Previous
              </button>

              <div className="pagination-info">
                Page {currentPage + 1} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="pagination-btn"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Individual Donation Card Component
interface DonationCardProps {
  donation: DonationResponse;
  onDownloadReceipt: (donation: DonationResponse) => void;
  onResendReceipt: (donation: DonationResponse) => void;
  getDonationIcon: (category: DonationCategory) => string;
}

const DonationCard: React.FC<DonationCardProps> = ({
  donation,
  onDownloadReceipt,
  onResendReceipt,
  getDonationIcon,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="donation-card">
      <div className="card-header" onClick={() => setShowDetails(!showDetails)}>
        <div className="donation-info">
          <div className="donation-icon">
            {getDonationIcon(donation.category)}
          </div>
          <div className="donation-details">
            <div className="amount">{formatCurrency(donation.amount)}</div>
            <div className="category">{donation.categoryDisplayName}</div>
            <div className="date">{formatDate(donation.timestamp)}</div>
          </div>
        </div>

        <div className="card-actions">
          {donation.isRecurring && (
            <span className="recurring-badge">🔄 Recurring</span>
          )}
          <button className="expand-btn">
            {showDetails ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="card-details">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Transaction ID:</span>
              <span className="detail-value">{donation.transactionId}</span>
            </div>

            {donation.purpose && (
              <div className="detail-item">
                <span className="detail-label">Purpose:</span>
                <span className="detail-value">{donation.purpose}</span>
              </div>
            )}

            {donation.paymentMethodBrand && donation.paymentMethodLast4 && (
              <div className="detail-item">
                <span className="detail-label">Payment Method:</span>
                <span className="detail-value">
                  {donation.paymentMethodBrand.charAt(0).toUpperCase() + donation.paymentMethodBrand.slice(1)}
                  ending in {donation.paymentMethodLast4}
                </span>
              </div>
            )}

            {donation.subscriptionFrequency && (
              <div className="detail-item">
                <span className="detail-label">Frequency:</span>
                <span className="detail-value">{donation.subscriptionFrequency}</span>
              </div>
            )}

            <div className="detail-item">
              <span className="detail-label">Receipt Status:</span>
              <span className={`detail-value ${donation.receiptSent ? 'sent' : 'pending'}`}>
                {donation.receiptSent ? '✅ Sent' : '⏳ Pending'}
              </span>
            </div>
          </div>

          <div className="card-actions-expanded">
            <button
              onClick={() => onDownloadReceipt(donation)}
              className="btn btn-secondary btn-small"
            >
              📄 Download Receipt
            </button>

            {donation.receiptSent && (
              <button
                onClick={() => onResendReceipt(donation)}
                className="btn btn-outline btn-small"
              >
                📧 Resend Receipt
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationHistory;