import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getReportedContent,
  moderateContent,
  getModerationStats,
  banUser,
  unbanUser,
  warnUser,
  getAuditLogs,
  PageResponse,
  AuditLog
} from '../services/adminApi';
import './AdminModeration.css';

const AdminModeration: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'content' | 'stats'>('reports');
  const [reportedContent, setReportedContent] = useState<any[]>([]);
  const [moderationStats, setModerationStats] = useState<any | null>(null);
  const [moderationLog, setModerationLog] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (activeTab === 'reports') {
        const reportsResponse = await getReportedContent({ page: 0, size: 50 });
        setReportedContent(reportsResponse.content || []);
      } else if (activeTab === 'stats') {
        const stats = await getModerationStats('30d');
        setModerationStats(stats);
        const logResponse = await getAuditLogs({ page: 0, size: 50 });
        setModerationLog(logResponse.content || []);
      }
    } catch (err: any) {
      console.error('Error loading moderation data:', err);
      setError('Failed to load moderation data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModerateContent = async (report: any, action: string, reason?: string) => {
    try {
      setActionLoading(report.id);
      
      // Extract contentType and contentId from the report
      const contentType = report.contentType || 'POST';
      const contentId = report.contentId || report.id;
      
      await moderateContent(contentType, contentId, action, reason || '');

      // Refresh the reports list
      const updatedReportsResponse = await getReportedContent({ page: 0, size: 50 });
      setReportedContent(updatedReportsResponse.content || []);

      // Refresh stats if on stats tab
      if (activeTab === 'stats') {
        const stats = await getModerationStats('30d');
        setModerationStats(stats);
      }
    } catch (err: any) {
      console.error('Error moderating content:', err);
      setError('Failed to moderate content');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'warn', reason?: string) => {
    try {
      setActionLoading(userId);

      if (action === 'ban') {
        await banUser(userId, reason || 'No reason provided', 'permanent');
      } else if (action === 'unban') {
        await unbanUser(userId, reason);
      } else if (action === 'warn') {
        await warnUser(userId, reason || 'No reason provided', reason);
      }

      // Refresh data
      loadData();
    } catch (err: any) {
      console.error('Error performing user action:', err);
      setError('Failed to perform user action');
    } finally {
      setActionLoading(null);
    }
  };

  const getActionColor = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'approve': return '#4caf50';
      case 'remove': return '#f44336';
      case 'hide': return '#ff9800';
      case 'warn': return '#ff5722';
      default: return '#2196f3';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'approve': return '✅';
      case 'remove': return '🗑️';
      case 'hide': return '🙈';
      case 'warn': return '⚠️';
      default: return '📝';
    }
  };

  if (isLoading && activeTab !== 'reports') {
    return (
      <div className="admin-moderation loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading moderation tools...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-moderation">
      {/* Header */}
      <div className="moderation-header">
        <div className="header-content">
          <h1>🛡️ Community Moderation</h1>
          <p>Maintain a safe and positive environment for your church community</p>
        </div>

        <div className="moderation-stats">
          <div className="stat-item">
            <span className="stat-number">{moderationStats?.activeReports || reportedContent.length || 0}</span>
            <span className="stat-label">Active Reports</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{moderationStats?.moderatedToday || 0}</span>
            <span className="stat-label">Moderated Today</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{moderationStats?.bannedUsers || 0}</span>
            <span className="stat-label">Banned Users</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="moderation-tabs">
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📋 Reports ({reportedContent.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button
          className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          📝 Content Moderation
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics & Logs
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="dismiss-error">
            ✕
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="moderation-content">
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="reports-section">
            <div className="section-header">
              <h2>Content Reports</h2>
              <p>Review and moderate reported content to maintain community standards</p>
            </div>

            {reportedContent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <h3>No reports to review</h3>
                <p>All reported content has been handled. Great job maintaining your community!</p>
              </div>
            ) : (
              <div className="reports-list">
                {reportedContent.map(report => (
                  <div key={report.id} className="report-card">
                    <div className="report-header">
                      <div className="report-meta">
                        <span className="report-type">{report.reportType || report.contentType}</span>
                        <span className="report-date">
                          Reported {new Date(report.reportedAt || report.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="report-priority">
                        <span className={`priority-badge ${report.priority || 'medium'}`}>
                          {(report.priority || 'medium').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="report-content">
                      <div className="reported-item">
                        <div className="item-header">
                          <div className="user-info">
                            <span className="user-name">{report.reportedUserName || 'Unknown User'}</span>
                            <span className="item-type">{report.contentType}</span>
                          </div>
                        </div>
                        <div className="item-content">
                          {report.contentPreview || 'Content preview not available'}
                        </div>
                      </div>

                      <div className="report-details">
                        <div className="reporter-info">
                          <span className="reporter-label">Reported by:</span>
                          <span className="reporter-name">{report.reporterName || 'Anonymous'}</span>
                        </div>
                        <div className="report-reason">
                          <span className="reason-label">Reason:</span>
                          <span className="reason-text">{report.reason}</span>
                        </div>
                        {report.additionalInfo && (
                          <div className="additional-info">
                            <span className="info-label">Details:</span>
                            <span className="info-text">{report.additionalInfo}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="report-actions">
                      <button
                        className="action-btn approve"
                        onClick={() => handleModerateContent(report, 'approve')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <>✅ Approve</>
                        )}
                      </button>

                      <button
                        className="action-btn hide"
                        onClick={() => handleModerateContent(report, 'hide', 'Content hidden for review')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <>🙈 Hide</>
                        )}
                      </button>

                      <button
                        className="action-btn warn"
                        onClick={() => handleModerateContent(report, 'warn', 'Content violates community guidelines')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <>⚠️ Warn User</>
                        )}
                      </button>

                      <button
                        className="action-btn remove"
                        onClick={() => handleModerateContent(report, 'remove', 'Content removed for violating guidelines')}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <div className="action-spinner"></div>
                        ) : (
                          <>🗑️ Remove</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>User Management</h2>
              <p>Manage user accounts and community membership</p>
            </div>

            <div className="user-management-tools">
              <div className="tool-card">
                <h3>🔍 User Search</h3>
                <div className="search-form">
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    className="user-search-input"
                  />
                  <button className="search-btn">Search</button>
                </div>
              </div>

              <div className="tool-card">
                <h3>🚫 Banned Users</h3>
                <div className="banned-users-list">
                  <div className="banned-user-item">
                    <div className="user-info">
                      <span className="user-name">John Doe</span>
                      <span className="ban-reason">Violated community guidelines</span>
                    </div>
                    <div className="user-actions">
                      <button className="unban-btn">Unban User</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tool-card">
                <h3>📧 Bulk Actions</h3>
                <div className="bulk-actions">
                  <button className="bulk-btn warn">Warn Selected Users</button>
                  <button className="bulk-btn suspend">Suspend Accounts</button>
                  <button className="bulk-btn notify">Send Notification</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="content-section">
            <div className="section-header">
              <h2>Content Moderation</h2>
              <p>Monitor and moderate community content</p>
            </div>

            <div className="content-tools">
              <div className="tool-card">
                <h3>🔍 Content Search</h3>
                <div className="content-filters">
                  <select className="filter-select">
                    <option>All Content</option>
                    <option>Posts</option>
                    <option>Comments</option>
                    <option>Media</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search content..."
                    className="content-search-input"
                  />
                  <button className="search-btn">Search</button>
                </div>
              </div>

              <div className="tool-card">
                <h3>🚨 Auto-Moderation</h3>
                <div className="auto-mod-settings">
                  <div className="setting-item">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Filter inappropriate language
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>
                      <input type="checkbox" defaultChecked />
                      Block spam content
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>
                      <input type="checkbox" />
                      Require approval for new users
                    </label>
                  </div>
                </div>
              </div>

              <div className="tool-card">
                <h3>📊 Content Statistics</h3>
                <div className="content-stats">
                  <div className="stat-item">
                    <span className="stat-number">1,247</span>
                    <span className="stat-label">Posts Today</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">89</span>
                    <span className="stat-label">Flagged Content</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">12</span>
                    <span className="stat-label">Removed Today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && moderationStats && (
          <div className="stats-section">
            <div className="section-header">
              <h2>Moderation Statistics</h2>
              <p>Track your community's health and moderation effectiveness</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">📋</span>
                  <span className="stat-title">Reports Handled</span>
                </div>
                <div className="stat-value">{moderationStats.totalReports || moderationStats.totalReportsHandled || 0}</div>
                <div className="stat-change positive">
                  +{moderationStats.reportsThisWeek || 0} this week
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">🚫</span>
                  <span className="stat-title">Content Removed</span>
                </div>
                <div className="stat-value">{moderationStats.contentRemoved || 0}</div>
                <div className="stat-change neutral">
                  {moderationStats.removalRate || 0}% of reports
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">⚠️</span>
                  <span className="stat-title">Warnings Issued</span>
                </div>
                <div className="stat-value">{moderationStats.warningsIssued || 0}</div>
                <div className="stat-change positive">
                  +{moderationStats.warningsThisWeek || 0} this week
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-icon">👤</span>
                  <span className="stat-title">Banned Users</span>
                </div>
                <div className="stat-value">{moderationStats.bannedUsers || 0}</div>
                <div className="stat-change negative">
                  {moderationStats.banRate || 0}% of active users
                </div>
              </div>
            </div>

            <div className="moderation-log">
              <h3>Recent Moderation Actions</h3>
              <div className="log-entries">
                {moderationLog.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="log-entry">
                    <div className="log-icon">{getActionIcon(entry.action)}</div>
                    <div className="log-content">
                      <div className="log-action">
                        {entry.action} - {entry.targetType || 'N/A'}
                      </div>
                      <div className="log-details">
                        {Object.entries(entry.details || {}).map(([key, value]) => `${key}: ${value}`).join(' • ') || 'No details'} • {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {moderationLog.length === 0 && (
                  <div className="empty-state">
                    <p>No moderation actions logged yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminModeration;
