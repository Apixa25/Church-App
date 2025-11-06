import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAdminAnalytics, AdminAnalytics } from '../services/adminApi';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  timeRange = '30d'
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      setError('');

      const data = await getAdminAnalytics(selectedTimeRange);
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num?: number): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num?: number): string => {
    if (!num && num !== 0) return '0%';
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case '1y': return 'Last year';
      default: return 'Last 30 days';
    }
  };

  if (isLoading) {
    return (
      <div className="analytics-dashboard loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading community insights...</span>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="analytics-dashboard error">
        <div className="error-content">
          <div className="error-icon">📊</div>
          <h2>Analytics Unavailable</h2>
          <p>{error || 'Unable to load analytics data'}</p>
          <button onClick={loadAnalytics} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-content">
          <h1>📊 Community Analytics</h1>
          <p>Insights to help grow your church community</p>
        </div>

        <div className="time-range-selector">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="time-range-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="analytics-overview">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">👥</span>
            <span className="metric-title">Total Members</span>
          </div>
          <div className="metric-value">
            {formatNumber(analytics.totalUsers)}
          </div>
          <div className={`metric-change ${(analytics.newUsersThisWeek ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            +{formatNumber(analytics.newUsersThisWeek)} this week
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📝</span>
            <span className="metric-title">Total Posts</span>
          </div>
          <div className="metric-value">
            {formatNumber(analytics.totalPosts)}
          </div>
          <div className={`metric-change ${(analytics.postsToday ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatNumber(analytics.postsToday)} today
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">❤️</span>
            <span className="metric-title">Total Interactions</span>
          </div>
          <div className="metric-value">
            {formatNumber(analytics.totalComments)}
          </div>
          <div className={`metric-change ${(analytics.commentsToday ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatNumber(analytics.commentsToday)} today
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📈</span>
            <span className="metric-title">Engagement Rate</span>
          </div>
          <div className="metric-value">
            {(analytics.prayerEngagementRate ?? 0).toFixed(1)}%
          </div>
          <div className={`metric-change ${(analytics.eventAttendanceRate ?? 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatNumber(analytics.eventAttendanceRate)}% attendance
          </div>
        </div>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="analytics-content">
        {/* Activity Chart */}
        <div className="analytics-section">
          <h2>📊 Community Activity</h2>
          <div className="activity-chart-placeholder">
            <div className="chart-placeholder-content">
              <div className="chart-icon">📈</div>
              <h3>Activity Timeline</h3>
              <p>Daily post and interaction counts over time</p>
              <div className="chart-mock">
                <div className="chart-bars">
                  {analytics.activityChart && analytics.activityChart.length > 0 ? (
                    analytics.activityChart.slice(-7).map((day, index) => (
                      <div key={index} className="chart-bar">
                        <div
                          className="bar-fill"
                          style={{ height: `${(day.value / Math.max(...analytics.activityChart.map(d => d.value), 1)) * 100}%` }}
                        ></div>
                        <span className="bar-label">{day.label || new Date(day.timestamp).getDate()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No activity data available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Categories */}
        <div className="analytics-section">
          <h2>📝 Content by Category</h2>
          <div className="category-breakdown">
            {analytics.topCategories && Object.keys(analytics.topCategories).length > 0 ? (
              Object.entries(analytics.topCategories).map(([name, count], index) => {
                const maxCount = Math.max(...Object.values(analytics.topCategories));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={index} className="category-item">
                    <div className="category-info">
                      <span className="category-name">{name}</span>
                      <span className="category-count">{formatNumber(count as number)}</span>
                    </div>
                    <div className="category-bar">
                      <div
                        className="category-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="category-percentage">{percentage.toFixed(1)}%</span>
                  </div>
                );
              })
            ) : (
              <div className="no-data">No category data available</div>
            )}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="analytics-section">
          <h2>⭐ Top Contributors</h2>
          <div className="contributors-list">
            {analytics.topContributors && analytics.topContributors.length > 0 ? (
              analytics.topContributors.map((contributor, index) => (
                <div key={contributor.userEmail || index} className="contributor-item">
                  <div className="contributor-rank">#{index + 1}</div>
                  <div className="contributor-avatar">
                    <div className="avatar-placeholder">
                      {contributor.userName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className="contributor-info">
                    <span className="contributor-name">{contributor.userName || 'Unknown User'}</span>
                    <span className="contributor-stats">
                      {formatNumber(contributor.totalContributions)} contributions • {contributor.primaryActivity || 'Active'}
                    </span>
                  </div>
                  <div className="contributor-score">
                    {formatNumber(contributor.totalContributions)}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No contributor data available</div>
            )}
          </div>
        </div>

        {/* Popular Content */}
        <div className="analytics-section">
          <h2>🔥 Popular Content</h2>
          <div className="topics-grid">
            {analytics.popularContent && analytics.popularContent.length > 0 ? (
              analytics.popularContent.slice(0, 6).map((content, index) => (
                <div key={content.title || index} className="topic-card">
                  <div className="topic-header">
                    <span className="topic-rank">#{index + 1}</span>
                    <span className="topic-hashtag">{content.type}</span>
                  </div>
                  <div className="topic-stats">
                    <div className="topic-stat">
                      <span className="stat-label">Title</span>
                      <span className="stat-value">{content.title?.substring(0, 20) || 'N/A'}</span>
                    </div>
                    <div className="topic-stat">
                      <span className="stat-label">Interactions</span>
                      <span className="stat-value">{formatNumber(content.interactions)}</span>
                    </div>
                  </div>
                  <div className="topic-trend">
                    <span className="trend-indicator">
                      By {content.author || 'Unknown'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-data">No popular content data available</div>
            )}
          </div>
        </div>

        {/* Community Health */}
        <div className="analytics-section">
          <h2>💚 Community Health</h2>
          <div className="health-metrics">
            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">🙏</span>
                <span>Prayer Requests</span>
              </div>
              <div className="metric-value">
                {formatNumber(analytics.totalPrayers)}
              </div>
              <div className="metric-description">
                Active prayer requests in community
              </div>
            </div>

            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">📢</span>
                <span>Announcements</span>
              </div>
              <div className="metric-value">
                {formatNumber(analytics.totalAnnouncements)}
              </div>
              <div className="metric-description">
                Important updates and events
              </div>
            </div>

            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">📅</span>
                <span>Events</span>
              </div>
              <div className="metric-value">
                {formatNumber(analytics.totalEvents)}
              </div>
              <div className="metric-description">
                Community events scheduled
              </div>
            </div>

            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">💰</span>
                <span>Donations</span>
              </div>
              <div className="metric-value">
                ${formatNumber(analytics.totalDonations)}
              </div>
              <div className="metric-description">
                Total donations this period
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="analytics-footer">
        <div className="export-section">
          <h3>📤 Export Analytics</h3>
          <div className="export-buttons">
            <button className="export-btn pdf">
              📄 Export as PDF
            </button>
            <button className="export-btn csv">
              📊 Export as CSV
            </button>
            <button className="export-btn json">
              💾 Export as JSON
            </button>
          </div>
        </div>

        <div className="analytics-info">
          <p>
            <strong>Time period:</strong> {getTimeRangeLabel(selectedTimeRange)}
          </p>
          <p>
            <strong>Active Users:</strong> {formatNumber(analytics.activeUsers)} • <strong>Total Users:</strong> {formatNumber(analytics.totalUsers)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
