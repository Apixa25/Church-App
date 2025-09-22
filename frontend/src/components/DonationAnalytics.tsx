import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  donationApi,
  DonationAnalytics as AnalyticsData,
  TopDonor,
  CategoryBreakdown,
  MonthlyTrend,
  formatCurrency,
  formatDate
} from '../services/donationApi';
import { DonationCategory, CATEGORY_LABELS } from '../config/stripe';
import './DonationAnalytics.css';

interface DonationAnalyticsProps {
  defaultDateRange?: '7d' | '30d' | '90d' | '1y';
}

const DonationAnalytics: React.FC<DonationAnalyticsProps> = ({
  defaultDateRange = '30d'
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>(defaultDateRange);
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'donors' | 'export'>('overview');

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics();
    }
  }, [dateRange, isAdmin]);

  useEffect(() => {
    if (isAdmin && activeTab === 'donors') {
      loadDonors();
    }
  }, [activeTab, isAdmin]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await donationApi.getAnalytics(dateRange);
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error loading donation analytics:', err);
      setError('Failed to load donation analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDonors = async () => {
    try {
      setDonorsLoading(true);
      const response = await donationApi.getDonors(0, 50);
      setDonors(response.content);
    } catch (err: any) {
      console.error('Error loading donors:', err);
    } finally {
      setDonorsLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const blob = await donationApi.exportDonations(format, dateRange);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `donations_${dateRange}_${Date.now()}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting donations:', err);
      alert('Failed to export donations. Please try again.');
    }
  };

  const formatGrowth = (growth: number): string => {
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthClass = (growth: number): string => {
    if (growth > 0) return 'growth-positive';
    if (growth < 0) return 'growth-negative';
    return 'growth-neutral';
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

  if (!isAdmin) {
    return (
      <div className="donation-analytics">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to view donation analytics.</p>
        </div>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="donation-analytics">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading donation analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="donation-analytics">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={loadAnalytics} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="donation-analytics">
      <div className="analytics-header">
        <h1>Donation Analytics</h1>
        <div className="date-range-selector">
          <label htmlFor="date-range">Date Range:</label>
          <select
            id="date-range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d' | '1y')}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
        </div>
      </div>

      <div className="analytics-tabs">
        <button
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          📈 Trends
        </button>
        <button
          className={`tab-button ${activeTab === 'donors' ? 'active' : ''}`}
          onClick={() => setActiveTab('donors')}
        >
          👥 Donors
        </button>
        <button
          className={`tab-button ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📄 Export
        </button>
      </div>

      <div className="analytics-content">
        {activeTab === 'overview' && analytics && (
          <OverviewTab analytics={analytics} getCategoryIcon={getCategoryIcon} formatGrowth={formatGrowth} getGrowthClass={getGrowthClass} />
        )}

        {activeTab === 'trends' && analytics && (
          <TrendsTab analytics={analytics} dateRange={dateRange} />
        )}

        {activeTab === 'donors' && (
          <DonorsTab donors={donors} loading={donorsLoading} />
        )}

        {activeTab === 'export' && (
          <ExportTab onExport={handleExport} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
interface OverviewTabProps {
  analytics: AnalyticsData;
  getCategoryIcon: (category: DonationCategory) => string;
  formatGrowth: (growth: number) => string;
  getGrowthClass: (growth: number) => string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  analytics,
  getCategoryIcon,
  formatGrowth,
  getGrowthClass
}) => (
  <div className="overview-tab">
    {/* Key Metrics */}
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-header">
          <h3>Total Donations</h3>
          <span className="metric-icon">💰</span>
        </div>
        <div className="metric-value">{formatCurrency(analytics.totalAmount)}</div>
        <div className="metric-subtitle">{analytics.totalDonations} donations</div>
        <div className={`growth ${getGrowthClass(analytics.periodComparison.growth.amountGrowth)}`}>
          {formatGrowth(analytics.periodComparison.growth.amountGrowth)} vs previous period
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <h3>Average Donation</h3>
          <span className="metric-icon">📊</span>
        </div>
        <div className="metric-value">{formatCurrency(analytics.averageDonation)}</div>
        <div className="metric-subtitle">Per donation</div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <h3>Total Donors</h3>
          <span className="metric-icon">👥</span>
        </div>
        <div className="metric-value">{analytics.donorCount}</div>
        <div className="metric-subtitle">Unique donors</div>
        <div className={`growth ${getGrowthClass(analytics.periodComparison.growth.donorGrowth)}`}>
          {formatGrowth(analytics.periodComparison.growth.donorGrowth)} vs previous period
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-header">
          <h3>Recurring Donations</h3>
          <span className="metric-icon">🔄</span>
        </div>
        <div className="metric-value">{formatCurrency(analytics.recurringAmount)}</div>
        <div className="metric-subtitle">{analytics.recurringDonations} subscriptions</div>
      </div>
    </div>

    {/* Category Breakdown */}
    <div className="section">
      <h2>Donation Categories</h2>
      <div className="categories-grid">
        {analytics.categoryBreakdown.map((category) => (
          <div key={category.category} className="category-card">
            <div className="category-header">
              <span className="category-icon">{getCategoryIcon(category.category)}</span>
              <h3>{category.categoryDisplayName}</h3>
            </div>
            <div className="category-amount">{formatCurrency(category.amount)}</div>
            <div className="category-stats">
              <div className="stat">
                <span className="stat-label">Donations:</span>
                <span className="stat-value">{category.count}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Percentage:</span>
                <span className="stat-value">{category.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="category-bar">
              <div
                className="category-bar-fill"
                style={{ width: `${category.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Recent Donations */}
    <div className="section">
      <h2>Recent Donations</h2>
      <div className="recent-donations">
        {analytics.recentDonations.slice(0, 5).map((donation) => (
          <div key={donation.id} className="recent-donation-item">
            <div className="donation-icon">
              {getCategoryIcon(donation.category)}
            </div>
            <div className="donation-info">
              <div className="donation-amount">{formatCurrency(donation.amount)}</div>
              <div className="donation-details">
                {donation.categoryDisplayName} • {donation.donorName}
              </div>
              <div className="donation-date">{formatDate(donation.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Trends Tab Component
interface TrendsTabProps {
  analytics: AnalyticsData;
  dateRange: string;
}

const TrendsTab: React.FC<TrendsTabProps> = ({ analytics, dateRange }) => (
  <div className="trends-tab">
    <h2>Monthly Trends</h2>
    <div className="trends-chart">
      {analytics.monthlyTrends.map((trend, index) => {
        const maxAmount = Math.max(...analytics.monthlyTrends.map(t => t.totalAmount));
        const height = (trend.totalAmount / maxAmount) * 100;

        return (
          <div key={`${trend.year}-${trend.month}`} className="trend-bar">
            <div className="trend-bar-container">
              <div
                className="trend-bar-fill"
                style={{ height: `${height}%` }}
              ></div>
            </div>
            <div className="trend-info">
              <div className="trend-amount">{formatCurrency(trend.totalAmount)}</div>
              <div className="trend-count">{trend.donationCount} donations</div>
              <div className="trend-month">{trend.month} {trend.year}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// Donors Tab Component
interface DonorsTabProps {
  donors: TopDonor[];
  loading: boolean;
}

const DonorsTab: React.FC<DonorsTabProps> = ({ donors, loading }) => (
  <div className="donors-tab">
    <h2>Top Donors</h2>
    {loading ? (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading donors...</p>
      </div>
    ) : (
      <div className="donors-table">
        <div className="table-header">
          <div className="header-cell">Donor</div>
          <div className="header-cell">Total Given</div>
          <div className="header-cell">Donations</div>
          <div className="header-cell">Average</div>
          <div className="header-cell">Last Donation</div>
          <div className="header-cell">Type</div>
        </div>
        {donors.map((donor, index) => (
          <div key={donor.userId} className="table-row">
            <div className="table-cell">
              <div className="donor-info">
                <div className="donor-rank">#{index + 1}</div>
                <div className="donor-name">{donor.donorName}</div>
              </div>
            </div>
            <div className="table-cell">
              <strong>{formatCurrency(donor.totalAmount)}</strong>
            </div>
            <div className="table-cell">{donor.donationCount}</div>
            <div className="table-cell">{formatCurrency(donor.averageDonation)}</div>
            <div className="table-cell">{formatDate(donor.lastDonationDate)}</div>
            <div className="table-cell">
              <span className={`donor-type ${donor.isRecurringDonor ? 'recurring' : 'one-time'}`}>
                {donor.isRecurringDonor ? '🔄 Recurring' : '💝 One-time'}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// Export Tab Component
interface ExportTabProps {
  onExport: (format: 'csv' | 'xlsx') => void;
  dateRange: string;
}

const ExportTab: React.FC<ExportTabProps> = ({ onExport, dateRange }) => (
  <div className="export-tab">
    <h2>Export Donation Data</h2>
    <div className="export-options">
      <div className="export-card">
        <h3>CSV Export</h3>
        <p>Download donation data in CSV format for spreadsheet analysis.</p>
        <button
          onClick={() => onExport('csv')}
          className="btn btn-primary"
        >
          📄 Download CSV
        </button>
      </div>

      <div className="export-card">
        <h3>Excel Export</h3>
        <p>Download donation data in Excel format with formatting and charts.</p>
        <button
          onClick={() => onExport('xlsx')}
          className="btn btn-primary"
        >
          📊 Download Excel
        </button>
      </div>
    </div>

    <div className="export-info">
      <h3>Export Information</h3>
      <ul>
        <li>Date range: {dateRange}</li>
        <li>Includes donor information, amounts, and categories</li>
        <li>Recurring donation details included</li>
        <li>Data is exported in your local timezone</li>
      </ul>
    </div>
  </div>
);

export default DonationAnalytics;