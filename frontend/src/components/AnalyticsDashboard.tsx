import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAnalyticsData, AnalyticsData } from '../services/postApi';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  timeRange = '30d'
}) => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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

      const data = await getAnalyticsData(selectedTimeRange);
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
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
            {formatNumber(analytics.totalMembers)}
          </div>
          <div className={`metric-change ${analytics.memberGrowth >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(analytics.memberGrowth)}
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
          <div className={`metric-change ${analytics.postGrowth >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(analytics.postGrowth)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">❤️</span>
            <span className="metric-title">Total Interactions</span>
          </div>
          <div className="metric-value">
            {formatNumber(analytics.totalInteractions)}
          </div>
          <div className={`metric-change ${analytics.interactionGrowth >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(analytics.interactionGrowth)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📈</span>
            <span className="metric-title">Engagement Rate</span>
          </div>
          <div className="metric-value">
            {analytics.engagementRate.toFixed(1)}%
          </div>
          <div className={`metric-change ${analytics.engagementChange >= 0 ? 'positive' : 'negative'}`}>
            {formatPercentage(analytics.engagementChange)}
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
                  {analytics.activityData?.slice(-7).map((day, index) => (
                    <div key={index} className="chart-bar">
                      <div
                        className="bar-fill"
                        style={{ height: `${(day.posts / Math.max(...analytics.activityData.map(d => d.posts))) * 100}%` }}
                      ></div>
                      <span className="bar-label">{new Date(day.date).getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Categories */}
        <div className="analytics-section">
          <h2>📝 Content by Category</h2>
          <div className="category-breakdown">
            {analytics.contentCategories.map((category, index) => (
              <div key={index} className="category-item">
                <div className="category-info">
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{formatNumber(category.count)}</span>
                </div>
                <div className="category-bar">
                  <div
                    className="category-fill"
                    style={{ width: `${(category.count / Math.max(...analytics.contentCategories.map(c => c.count))) * 100}%` }}
                  ></div>
                </div>
                <span className="category-percentage">{category.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="analytics-section">
          <h2>⭐ Top Contributors</h2>
          <div className="contributors-list">
            {analytics.topContributors.map((contributor, index) => (
              <div key={contributor.userId} className="contributor-item">
                <div className="contributor-rank">#{index + 1}</div>
                <div className="contributor-avatar">
                  {contributor.profilePicUrl ? (
                    <img src={contributor.profilePicUrl} alt={contributor.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {contributor.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="contributor-info">
                  <span className="contributor-name">{contributor.name}</span>
                  <span className="contributor-stats">
                    {formatNumber(contributor.postsCount)} posts • {formatNumber(contributor.interactions)} interactions
                  </span>
                </div>
                <div className="contributor-score">
                  {formatNumber(contributor.engagementScore)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Topics */}
        <div className="analytics-section">
          <h2>🔥 Popular Topics</h2>
          <div className="topics-grid">
            {analytics.popularTopics.map((topic, index) => (
              <div key={topic.hashtag} className="topic-card">
                <div className="topic-header">
                  <span className="topic-rank">#{index + 1}</span>
                  <span className="topic-hashtag">#{topic.hashtag}</span>
                </div>
                <div className="topic-stats">
                  <div className="topic-stat">
                    <span className="stat-label">Posts</span>
                    <span className="stat-value">{formatNumber(topic.postsCount)}</span>
                  </div>
                  <div className="topic-stat">
                    <span className="stat-label">Interactions</span>
                    <span className="stat-value">{formatNumber(topic.interactions)}</span>
                  </div>
                </div>
                <div className="topic-trend">
                  <span className={`trend-indicator ${topic.trend >= 0 ? 'up' : 'down'}`}>
                    {topic.trend >= 0 ? '📈' : '📉'} {Math.abs(topic.trend)}%
                  </span>
                </div>
              </div>
            ))}
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
                {formatNumber(analytics.prayerRequests)}
              </div>
              <div className="metric-description">
                Active prayer requests in community
              </div>
            </div>

            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">✨</span>
                <span>Testimonies</span>
              </div>
              <div className="metric-value">
                {formatNumber(analytics.testimonies)}
              </div>
              <div className="metric-description">
                Faith stories shared this period
              </div>
            </div>

            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">📢</span>
                <span>Announcements</span>
              </div>
              <div className="metric-value">
                {formatNumber(analytics.announcements)}
              </div>
              <div className="metric-description">
                Important updates and events
              </div>
            </div>

            <div className="health-metric">
              <div className="metric-label">
                <span className="metric-icon">❤️</span>
                <span>Answered Prayers</span>
              </div>
              <div className="metric-value">
                {formatNumber(analytics.answeredPrayers)}
              </div>
              <div className="metric-description">
                Prayers marked as answered
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
            <strong>Last updated:</strong> {new Date(analytics.lastUpdated).toLocaleString()}
          </p>
          <p>
            <strong>Time period:</strong> {getTimeRangeLabel(selectedTimeRange)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
