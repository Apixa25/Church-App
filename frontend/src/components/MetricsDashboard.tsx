import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import './MetricsDashboard.css';
import dashboardApi, {
  MetricsDashboardData,
  MetricsTrendPoint,
  ContentTrendPoint,
  TopOrganizationMetric,
} from '../services/dashboardApi';

const rangeOptions = [
  { label: '30 Days', value: 30 },
  { label: '60 Days', value: 60 },
  { label: '90 Days', value: 90 },
  { label: '180 Days', value: 180 },
];

const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<number>(30);

  useEffect(() => {
    loadMetrics();
  }, [selectedRange]);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      setError('');

      const data = await dashboardApi.getMetricsDashboard(selectedRange);
      setMetrics(data);
    } catch (err: any) {
      console.error('Error loading metrics dashboard:', err);
      setError('Failed to load metrics dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes?: number): string => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, power);
    return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
  };

  const formatNumber = (num?: number): string => {
    if (!num && num !== 0) return '0';
    return num.toLocaleString();
  };

  const formatDateLabel = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const storageTrendData = useMemo(() => {
    if (!metrics?.storageTrend) return [];
    return metrics.storageTrend.map((point: MetricsTrendPoint) => ({
      date: point.date,
      displayDate: formatDateLabel(point.date),
      valueGb: point.value / (1024 * 1024 * 1024),
      value: point.value,
    }));
  }, [metrics]);

  const activeUsersTrendData = useMemo(() => {
    if (!metrics?.activeUsersTrend) return [];
    return metrics.activeUsersTrend.map(point => ({
      date: point.date,
      displayDate: formatDateLabel(point.date),
      value: point.value,
    }));
  }, [metrics]);

  const contentTrendData = useMemo(() => {
    if (!metrics?.contentTrend) return [];
    return metrics.contentTrend.map((point: ContentTrendPoint) => ({
      date: point.date,
      displayDate: formatDateLabel(point.date),
      posts: point.posts,
      prayers: point.prayerRequests,
      events: point.events,
      announcements: point.announcements,
    }));
  }, [metrics]);

  const topOrganizations = metrics?.topOrganizations || [];

  if (isLoading || !metrics) {
    return (
      <div className="metrics-dashboard loading">
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>Loading metrics dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="metrics-dashboard error">
        <div className="error-card">
          <h3>Unable to load metrics</h3>
          <p>{error}</p>
          <button onClick={loadMetrics}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-dashboard">
      <div className="metrics-header">
        <div>
          <h2>🚀 Organization Metrics Dashboard</h2>
          <p>System-wide storage, activity, and growth insights</p>
        </div>
        <div className="metrics-controls">
          <label htmlFor="metrics-range">Range</label>
          <select
            id="metrics-range"
            value={selectedRange}
            onChange={(e) => setSelectedRange(parseInt(e.target.value, 10))}
          >
            {rangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="last-updated">
            Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Total Organizations</div>
          <div className="summary-value">{formatNumber(metrics.summary.totalOrganizations)}</div>
          <span className="summary-sub">Avg Storage {formatBytes(metrics.summary.averageStoragePerOrganization)}</span>
        </div>
        <div className="summary-card">
          <div className="summary-label">Storage Used</div>
          <div className="summary-value">{formatBytes(metrics.summary.totalStorageUsed)}</div>
          <span className="summary-sub">{formatNumber(metrics.summary.totalActiveUsers)} active users</span>
        </div>
        <div className="summary-card">
          <div className="summary-label">API Requests</div>
          <div className="summary-value">{formatNumber(metrics.summary.totalApiRequests)}</div>
          <span className="summary-sub">{formatBytes(metrics.summary.totalDataTransferBytes)} transferred</span>
        </div>
        <div className="summary-card">
          <div className="summary-label">Content Created</div>
          <div className="summary-value">{formatNumber(metrics.summary.totalPosts + metrics.summary.totalPrayerRequests + metrics.summary.totalEvents + metrics.summary.totalAnnouncements)}</div>
          <span className="summary-sub">
            Posts {formatNumber(metrics.summary.totalPosts)} · Prayers {formatNumber(metrics.summary.totalPrayerRequests)}
          </span>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metrics-panel">
          <div className="panel-header">
            <h3>Storage Trend</h3>
            <span>{formatBytes(metrics.summary.totalStorageUsed)} total</span>
          </div>
          <div className="panel-chart">
            {storageTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={storageTrendData}>
                  <defs>
                    <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis tickFormatter={(value) => `${value.toFixed(0)} GB`} />
                  <Tooltip formatter={(value: number) => `${value.toFixed(2)} GB`} />
                  <Area
                    type="monotone"
                    dataKey="valueGb"
                    stroke="#0088FE"
                    fillOpacity={1}
                    fill="url(#storageGradient)"
                    name="Storage (GB)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No storage history yet</div>
            )}
          </div>
        </div>

        <div className="metrics-panel">
          <div className="panel-header">
            <h3>Active Users Trend</h3>
            <span>{formatNumber(metrics.summary.totalActiveUsers)} active users</span>
          </div>
          <div className="panel-chart">
            {activeUsersTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={activeUsersTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${formatNumber(value)} users`} />
                  <Line type="monotone" dataKey="value" stroke="#00C49F" strokeWidth={2} name="Active Users" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No active user history yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metrics-panel">
          <div className="panel-header">
            <h3>Content Creation Trend</h3>
            <span>
              Posts {formatNumber(metrics.summary.totalPosts)} · Prayers {formatNumber(metrics.summary.totalPrayerRequests)} · Events {formatNumber(metrics.summary.totalEvents)}
            </span>
          </div>
          <div className="panel-chart">
            {contentTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={contentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="displayDate" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="posts" stackId="a" fill="#8884d8" name="Posts" />
                  <Bar dataKey="prayers" stackId="a" fill="#82ca9d" name="Prayers" />
                  <Bar dataKey="events" stackId="a" fill="#ffc658" name="Events" />
                  <Bar dataKey="announcements" stackId="a" fill="#ff8042" name="Announcements" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No content history yet</div>
            )}
          </div>
        </div>

        <div className="metrics-panel">
          <div className="panel-header">
            <h3>Top Organizations</h3>
            <span>Sorted by storage usage</span>
          </div>
          <div className="top-org-table">
            {topOrganizations.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Storage</th>
                    <th>Active Users</th>
                    <th>Content</th>
                  </tr>
                </thead>
                <tbody>
                  {topOrganizations.map((org: TopOrganizationMetric) => (
                    <tr key={org.organizationId}>
                      <td>
                        <div className="org-name">{org.organizationName}</div>
                        <span className="org-meta">{org.storagePercent}% of total</span>
                      </td>
                      <td>{formatBytes(org.storageUsed)}</td>
                      <td>{formatNumber(org.activeUsers)}</td>
                      <td>
                        <span className="content-chip">Posts {formatNumber(org.postsCount)}</span>
                        <span className="content-chip">Prayers {formatNumber(org.prayerRequestsCount)}</span>
                        <span className="content-chip">Announcements {formatNumber(org.announcementsCount)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">No organizations available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;

