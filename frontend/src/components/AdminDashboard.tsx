import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminModeration from './AdminModeration';
import AnalyticsDashboard from './AnalyticsDashboard';
import {
  getUsers,
  updateUserRole,
  banUser,
  unbanUser,
  warnUser,
  deleteUser,
  getAdminAnalytics,
  getAuditLogs,
  getSystemHealth,
  User,
  AdminAnalytics,
  AuditLog,
  SystemHealth
} from '../services/adminApi';
import './AdminDashboard.css';

interface AdminDashboardProps {
  initialTab?: 'overview' | 'users' | 'content' | 'analytics' | 'audit' | 'settings';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = 'overview'
}) => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters and pagination
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [bannedFilter, setBannedFilter] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage, userSearch, userRole, bannedFilter, timeRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      switch (activeTab) {
        case 'overview':
          await Promise.all([
            loadAnalytics(),
            loadSystemHealth(),
            loadRecentUsers()
          ]);
          break;
        case 'users':
          await loadUsers();
          break;
        case 'analytics':
          await loadAnalytics();
          break;
        case 'audit':
          await loadAuditLogs();
          break;
        default:
          break;
      }
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setError('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    const userData = await getUsers({
      page: currentPage,
      size: 20,
      search: userSearch,
      role: userRole,
      banned: bannedFilter
    });
    setUsers(userData.content);
  };

  const loadRecentUsers = async () => {
    const userData = await getUsers({ page: 0, size: 5 });
    setUsers(userData.content);
  };

  const loadAnalytics = async () => {
    const analyticsData = await getAdminAnalytics(timeRange);
    setAnalytics(analyticsData);
  };

  const loadAuditLogs = async () => {
    const logsData = await getAuditLogs({ page: currentPage, size: 20 });
    setAuditLogs(logsData.content);
  };

  const loadSystemHealth = async () => {
    const healthData = await getSystemHealth();
    setSystemHealth(healthData);
  };

  const handleUserAction = async (
    userId: string,
    action: 'updateRole' | 'ban' | 'unban' | 'warn' | 'delete',
    payload?: any
  ) => {
    try {
      setActionLoading(userId);

      switch (action) {
        case 'updateRole':
          await updateUserRole(userId, payload.role, payload.reason);
          break;
        case 'ban':
          await banUser(userId, payload.reason, payload.duration);
          break;
        case 'unban':
          await unbanUser(userId, payload.reason);
          break;
        case 'warn':
          await warnUser(userId, payload.reason, payload.message);
          break;
        case 'delete':
          await deleteUser(userId, payload.reason);
          break;
      }

      // Refresh data
      await loadUsers();
    } catch (err: any) {
      console.error(`Error performing ${action} on user:`, err);
      setError(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatNumber = (num?: number): string => {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getHealthColor = (status?: string): string => {
    switch (status?.toLowerCase()) {
      case 'up': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'down': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MODERATOR')) {
    return (
      <div className="admin-dashboard unauthorized">
        <div className="unauthorized-content">
          <h1>🚫 Access Denied</h1>
          <p>You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🛠️ Admin Dashboard</h1>
            <p>Manage your church community platform</p>
          </div>

          <div className="admin-meta">
            <div className="admin-role">
              <span className={`role-badge ${currentUser.role.toLowerCase()}`}>
                {currentUser.role}
              </span>
            </div>
            {systemHealth && (
              <div className="system-status">
                <div
                  className="status-indicator"
                  style={{ backgroundColor: getHealthColor(systemHealth.status) }}
                ></div>
                <span>System {systemHealth.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users ({analytics?.totalUsers || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            🛡️ Moderation
          </button>
          <button
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
          {currentUser.role === 'ADMIN' && (
            <button
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              📋 Audit Logs
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="dismiss-error">✕</button>
        </div>
      )}

      {/* Tab Content */}
      <div className="admin-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="overview-grid">
              {/* Quick Stats */}
              <div className="stats-grid">
                <div className="stat-card users">
                  <div className="stat-header">
                    <span className="stat-icon">👥</span>
                    <span className="stat-title">Total Users</span>
                  </div>
                  <div className="stat-value">{formatNumber(analytics?.totalUsers)}</div>
                  <div className="stat-meta">
                    <span className="stat-detail">
                      {formatNumber(analytics?.activeUsers)} active
                    </span>
                    <span className="stat-change positive">
                      +{formatNumber(analytics?.newUsersThisWeek)} this week
                    </span>
                  </div>
                </div>

                <div className="stat-card content">
                  <div className="stat-header">
                    <span className="stat-icon">📝</span>
                    <span className="stat-title">Content</span>
                  </div>
                  <div className="stat-value">{formatNumber(analytics?.totalPosts)}</div>
                  <div className="stat-meta">
                    <span className="stat-detail">
                      {formatNumber(analytics?.postsToday)} today
                    </span>
                    <span className="stat-change positive">
                      {formatNumber(analytics?.totalPrayers)} prayers
                    </span>
                  </div>
                </div>

                <div className="stat-card moderation">
                  <div className="stat-header">
                    <span className="stat-icon">🛡️</span>
                    <span className="stat-title">Moderation</span>
                  </div>
                  <div className="stat-value">{formatNumber(analytics?.totalReports)}</div>
                  <div className="stat-meta">
                    <span className="stat-detail">
                      {formatNumber(analytics?.activeReports)} pending
                    </span>
                    <span className="stat-change neutral">
                      {formatNumber(analytics?.bannedUsers)} banned
                    </span>
                  </div>
                </div>

                <div className="stat-card donations">
                  <div className="stat-header">
                    <span className="stat-icon">💰</span>
                    <span className="stat-title">Donations</span>
                  </div>
                  <div className="stat-value">
                    ${formatNumber(analytics?.totalDonations)}
                  </div>
                  <div className="stat-meta">
                    <span className="stat-detail">
                      ${formatNumber(analytics?.donationsThisMonth)} this month
                    </span>
                    <span className="stat-change positive">
                      {formatNumber(analytics?.uniqueDonors)} donors
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity">
                <h3>👋 Recent Members</h3>
                <div className="recent-users">
                  {users.slice(0, 5).map(user => (
                    <div key={user.id} className="recent-user">
                      <div className="user-avatar">
                        {user.profilePicUrl ? (
                          <img src={user.profilePicUrl} alt={user.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <span className="user-name">{user.name}</span>
                        <span className="user-meta">
                          {user.role} • {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className={`user-status ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? '🟢' : '🔴'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              {systemHealth && (
                <div className="system-health">
                  <h3>💚 System Health</h3>
                  <div className="health-grid">
                    <div className="health-item">
                      <span className="health-label">Database</span>
                      <span
                        className="health-status"
                        style={{ color: getHealthColor(systemHealth.database) }}
                      >
                        {systemHealth.database}
                      </span>
                    </div>
                    <div className="health-item">
                      <span className="health-label">Memory</span>
                      <span className="health-status">{systemHealth.memoryUsage}</span>
                    </div>
                    <div className="health-item">
                      <span className="health-label">Load</span>
                      <span className="health-status">{systemHealth.systemLoad}</span>
                    </div>
                    <div className="health-item">
                      <span className="health-label">Uptime</span>
                      <span className="health-status">
                        {new Date(systemHealth.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>👥 User Management</h2>
              <div className="user-filters">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="search-input"
                />
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="role-filter"
                >
                  <option value="">All Roles</option>
                  <option value="MEMBER">Member</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <select
                  value={bannedFilter === null ? '' : bannedFilter.toString()}
                  onChange={(e) => setBannedFilter(e.target.value === '' ? null : e.target.value === 'true')}
                  className="banned-filter"
                >
                  <option value="">All Users</option>
                  <option value="false">Active Users</option>
                  <option value="true">Banned Users</option>
                </select>
              </div>
            </div>

            <div className="users-table">
              <div className="table-header">
                <div className="header-cell">User</div>
                <div className="header-cell">Role</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Joined</div>
                <div className="header-cell">Warnings</div>
                <div className="header-cell">Actions</div>
              </div>

              {users.map(user => (
                <div key={user.id} className="table-row">
                  <div className="user-cell">
                    <div className="user-avatar">
                      {user.profilePicUrl ? (
                        <img src={user.profilePicUrl} alt={user.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </div>

                  <div className="role-cell">
                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </div>

                  <div className="status-cell">
                    {user.isBanned ? (
                      <span className="status-badge banned">Banned</span>
                    ) : user.isActive ? (
                      <span className="status-badge active">Active</span>
                    ) : (
                      <span className="status-badge inactive">Inactive</span>
                    )}
                  </div>

                  <div className="date-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>

                  <div className="warnings-cell">
                    <span className={`warning-count ${user.warningCount > 2 ? 'high' : user.warningCount > 0 ? 'medium' : ''}`}>
                      {user.warningCount}
                    </span>
                  </div>

                  <div className="actions-cell">
                    <div className="action-buttons">
                      {user.isBanned ? (
                        <button
                          className="action-btn unban"
                          onClick={() => handleUserAction(user.id, 'unban', { reason: 'Admin action' })}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? '⏳' : '✅'} Unban
                        </button>
                      ) : (
                        <>
                          <button
                            className="action-btn warn"
                            onClick={() => {
                              const reason = prompt('Warning reason:');
                              if (reason) {
                                handleUserAction(user.id, 'warn', { reason, message: reason });
                              }
                            }}
                            disabled={actionLoading === user.id}
                          >
                            ⚠️ Warn
                          </button>
                          <button
                            className="action-btn ban"
                            onClick={() => {
                              const reason = prompt('Ban reason:');
                              if (reason) {
                                handleUserAction(user.id, 'ban', { reason, duration: 'permanent' });
                              }
                            }}
                            disabled={actionLoading === user.id}
                          >
                            🚫 Ban
                          </button>
                        </>
                      )}

                      {user.role !== 'ADMIN' && (
                        <select
                          className="role-selector"
                          value={user.role}
                          onChange={(e) => {
                            const reason = prompt('Reason for role change:');
                            if (reason) {
                              handleUserAction(user.id, 'updateRole', { role: e.target.value, reason });
                            }
                          }}
                          disabled={actionLoading === user.id}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      )}

                      {currentUser.role === 'ADMIN' && user.id !== currentUser.id && (
                        <button
                          className="action-btn delete"
                          onClick={() => {
                            const confirmed = window.confirm(
                              `⚠️ WARNING: This will permanently delete user "${user.name}" (${user.email}).\n\n` +
                              `This action cannot be undone. All user data, posts, comments, and history will be permanently removed.\n\n` +
                              `Are you absolutely sure you want to delete this user?`
                            );
                            if (confirmed) {
                              const reason = prompt('Please provide a reason for deleting this user:');
                              if (reason) {
                                handleUserAction(user.id, 'delete', { reason });
                              }
                            }
                          }}
                          disabled={actionLoading === user.id}
                          title="Delete user permanently"
                        >
                          {actionLoading === user.id ? '⏳' : '🗑️'} Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Moderation Tab */}
        {activeTab === 'content' && (
          <AdminModeration />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard timeRange={timeRange as any} />
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && currentUser.role === 'ADMIN' && (
          <div className="audit-section">
            <div className="section-header">
              <h2>📋 Audit Logs</h2>
              <p>Track all administrative actions and system events</p>
            </div>

            <div className="audit-logs">
              {auditLogs.map(log => (
                <div key={log.id} className="audit-log-entry">
                  <div className="log-header">
                    <span className="log-action">{log.action}</span>
                    <span className="log-timestamp">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="log-details">
                    <span className="log-user">User: {log.userId}</span>
                    {log.targetType && (
                      <span className="log-target">Target: {log.targetType} {log.targetId}</span>
                    )}
                  </div>
                  {log.details && (
                    <div className="log-metadata">
                      {Object.entries(log.details).map(([key, value]) => (
                        <span key={key} className="log-detail">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>⚙️ Admin Settings</h2>
              <p>Configure system settings and preferences</p>
            </div>

            <div className="settings-grid">
              <div className="setting-group">
                <h3>🛡️ Moderation Settings</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Enable auto-moderation
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Require approval for new posts
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    Auto-ban after
                    <input type="number" defaultValue="5" min="1" max="10" />
                    warnings
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h3>📧 Notification Settings</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Email notifications for reports
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Daily admin digest
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <h3>📊 Analytics Settings</h3>
                <div className="setting-item">
                  <label>
                    <input type="checkbox" defaultChecked />
                    Track user activity
                  </label>
                </div>
                <div className="setting-item">
                  <label>
                    Data retention period
                    <select defaultValue="1y">
                      <option value="3m">3 months</option>
                      <option value="6m">6 months</option>
                      <option value="1y">1 year</option>
                      <option value="2y">2 years</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button className="save-settings-btn">💾 Save Settings</button>
              <button className="export-data-btn">📤 Export All Data</button>
              <button className="backup-btn">🔄 Create Backup</button>
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span>Loading admin data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;