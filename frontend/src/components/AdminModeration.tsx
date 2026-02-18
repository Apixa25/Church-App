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
  getUsers,
  getReportedContent as getContentReports,
  PageResponse,
  AuditLog,
  User
} from '../services/adminApi';
import LoadingSpinner from './LoadingSpinner';
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
  
  // User Management state
  const [users, setUsers] = useState<User[]>([]);
  const [bannedUsers, setBannedUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Content Moderation state
  const [contentSearchQuery, setContentSearchQuery] = useState<string>('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [contentStats, setContentStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Always load stats for header counters
      try {
        const stats = await getModerationStats('30d');
        setModerationStats(stats);
      } catch (statsErr) {
        console.error('Error loading moderation stats:', statsErr);
        // Don't fail entire load if stats fail
      }

      if (activeTab === 'reports') {
        // Default to showing only PENDING reports
        const reportsResponse = await getReportedContent({ page: 0, size: 50, status: 'PENDING' });
        setReportedContent(reportsResponse.content || []);
      } else if (activeTab === 'users') {
        // Load banned users
        const bannedResponse = await getUsers({ page: 0, size: 50, banned: true });
        setBannedUsers(bannedResponse.content || []);
        
        // Load all users (for search)
        if (userSearchQuery) {
          const usersResponse = await getUsers({ page: 0, size: 50, search: userSearchQuery });
          setUsers(usersResponse.content || []);
        } else {
          setUsers([]);
        }
      } else if (activeTab === 'content') {
        // Load content statistics from moderation stats
        setContentStats(moderationStats);
        
        // Load content reports if searching
        if (contentSearchQuery || contentTypeFilter !== 'all') {
          const contentType = contentTypeFilter !== 'all' ? contentTypeFilter.toUpperCase() : undefined;
          const contentResponse = await getContentReports({ 
            page: 0, 
            size: 50, 
            contentType 
          });
          setReportedContent(contentResponse.content || []);
        } else {
          setReportedContent([]);
        }
      } else if (activeTab === 'stats') {
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

      // Refresh the reports list - only show PENDING reports
      const updatedReportsResponse = await getReportedContent({ page: 0, size: 50, status: 'PENDING' });
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

      // Refresh data - reload stats and user lists
      try {
        const stats = await getModerationStats('30d');
        setModerationStats(stats);
        
        if (activeTab === 'users') {
          const bannedResponse = await getUsers({ page: 0, size: 50, banned: true });
          setBannedUsers(bannedResponse.content || []);
          
          if (userSearchQuery) {
            const usersResponse = await getUsers({ page: 0, size: 50, search: userSearchQuery });
            setUsers(usersResponse.content || []);
          }
        }
      } catch (refreshErr) {
        console.error('Error refreshing data:', refreshErr);
      }
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
          <LoadingSpinner type="multi-ring" size="medium" text="Loading moderation tools..." />
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
                            <span className="user-name">{report.contentAuthor || 'Unknown User'}</span>
                            <span className="item-type">{report.contentType}</span>
                          </div>
                        </div>
                        <div className="item-content">
                          {report.contentType === 'USER' ? (
                            <div className="user-preview">
                              {report.mediaUrls && report.mediaUrls.length > 0 && (
                                <div className="user-avatar-container">
                                  <img
                                    src={report.mediaUrls[0]}
                                    alt="User profile"
                                    className="user-avatar-preview"
                                  />
                                </div>
                              )}
                              <div className="user-preview-text">
                                {report.contentPreview ? (
                                  report.contentPreview.split('\n').map((line: string, idx: number) => {
                                    if (!line.trim()) return <br key={idx} />;
                                    if (line.startsWith('⚠️') || line.startsWith('✓')) {
                                      return (
                                        <div key={idx} className="user-preview-line status-line">
                                          {line}
                                        </div>
                                      );
                                    }
                                    if (line.includes(':')) {
                                      const [label, ...valueParts] = line.split(':');
                                      const value = valueParts.join(':').trim();
                                      return (
                                        <div key={idx} className="user-preview-line">
                                          <strong>{label.trim()}:</strong> {value}
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={idx} className="user-preview-line">
                                        {line}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div>User information not available</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="post-text">{report.contentPreview || 'Content preview not available'}</div>
                              {report.mediaUrls && report.mediaUrls.length > 0 && (
                                <div className="post-media">
                                  {report.mediaUrls.map((url: string, index: number) => {
                                    const mediaType = report.mediaTypes?.[index] || 'image';
                                    const isImage = mediaType.startsWith('image');

                                    return (
                                      <div 
                                        key={index} 
                                        className="media-item"
                                      >
                                        {isImage ? (
                                          <img
                                            src={url}
                                            alt={`Post media ${index + 1}`}
                                            className="media-image"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <video
                                            src={url}
                                            controls
                                            className="media-video"
                                            preload="metadata"
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="report-details">
                        <div className="reporter-info">
                          <span className="reporter-label">Reported by:</span>
                          <span className="reporter-name">{report.reportedBy || 'Anonymous'}</span>
                        </div>
                        <div className="report-reason">
                          <span className="reason-label">Reason:</span>
                          <span className="reason-text">{report.reportReason || 'No reason provided'}</span>
                        </div>
                        {report.reportDescription && (
                          <div className="additional-info">
                            <span className="info-label">Details:</span>
                            <span className="info-text">{report.reportDescription}</span>
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

                      {report.isHidden ? (
                        <button
                          className="action-btn unhide"
                          onClick={() => handleModerateContent(report, 'unhide', 'Content unhidden after review')}
                          disabled={actionLoading === report.id}
                        >
                          {actionLoading === report.id ? (
                            <div className="action-spinner"></div>
                          ) : (
                            <>👁️ Unhide</>
                          )}
                        </button>
                      ) : (
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
                      )}

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
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        loadData();
                      }
                    }}
                  />
                  <button 
                    className="search-btn"
                    onClick={() => loadData()}
                  >
                    Search
                  </button>
                </div>
                {users.length > 0 && (
                  <div className="search-results">
                    <h4>Search Results ({users.length})</h4>
                    <div className="users-list">
                      {users.map((user) => (
                        <div key={user.id} className="user-item">
                          <div className="user-info">
                            {user.profilePicUrl && (
                              <img src={user.profilePicUrl} alt={user.name} className="user-avatar" />
                            )}
                            <div className="user-details">
                              <span className="user-name">{user.name}</span>
                              <span className="user-email">{user.email}</span>
                              <div className="user-meta">
                                <span className={`status-badge ${user.isBanned ? 'banned' : user.isActive ? 'active' : 'inactive'}`}>
                                  {user.isBanned ? '🚫 Banned' : user.isActive ? '✓ Active' : '⚠️ Inactive'}
                                </span>
                                {user.warningCount > 0 && (
                                  <span className="warning-badge">⚠️ {user.warningCount} warning{user.warningCount !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="user-actions">
                            {user.isBanned ? (
                              <button
                                className="action-btn unban"
                                onClick={() => handleUserAction(user.id, 'unban', 'Unbanned by admin')}
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? '...' : 'Unban'}
                              </button>
                            ) : (
                              <>
                                <button
                                  className="action-btn warn"
                                  onClick={() => {
                                    const reason = prompt('Warning reason:');
                                    if (reason) {
                                      handleUserAction(user.id, 'warn', reason);
                                    }
                                  }}
                                  disabled={actionLoading === user.id}
                                >
                                  Warn
                                </button>
                                <button
                                  className="action-btn ban"
                                  onClick={() => {
                                    const reason = prompt('Ban reason:');
                                    if (reason) {
                                      handleUserAction(user.id, 'ban', reason);
                                    }
                                  }}
                                  disabled={actionLoading === user.id}
                                >
                                  Ban
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="tool-card">
                <h3>🚫 Banned Users ({bannedUsers.length})</h3>
                <div className="banned-users-list">
                  {bannedUsers.length === 0 ? (
                    <div className="empty-state">
                      <p>No banned users.</p>
                    </div>
                  ) : (
                    bannedUsers.map((user) => (
                      <div key={user.id} className="banned-user-item">
                        <div className="user-info">
                          {user.profilePicUrl && (
                            <img src={user.profilePicUrl} alt={user.name} className="user-avatar" />
                          )}
                          <div className="user-details">
                            <span className="user-name">{user.name}</span>
                            <span className="user-email">{user.email}</span>
                            {user.banReason && (
                              <span className="ban-reason">{user.banReason}</span>
                            )}
                            {user.bannedAt && (
                              <span className="ban-date">Banned: {new Date(user.bannedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="user-actions">
                          <button
                            className="unban-btn"
                            onClick={() => handleUserAction(user.id, 'unban', 'Unbanned by admin')}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? '...' : 'Unban User'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="tool-card">
                <h3>📧 Quick Actions</h3>
                <div className="bulk-actions">
                  <p className="info-text">Use the search above to find users, then use individual action buttons to manage them.</p>
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
                <h3>🔍 Content Search & Filter</h3>
                <div className="content-filters">
                  <select 
                    className="filter-select"
                    value={contentTypeFilter}
                    onChange={(e) => {
                      setContentTypeFilter(e.target.value);
                      loadData();
                    }}
                  >
                    <option value="all">All Content</option>
                    <option value="post">Posts</option>
                    <option value="comment">Comments</option>
                    <option value="marketplace">Marketplace Listings</option>
                    <option value="user">Users</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search content..."
                    className="content-search-input"
                    value={contentSearchQuery}
                    onChange={(e) => setContentSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        loadData();
                      }
                    }}
                  />
                  <button 
                    className="search-btn"
                    onClick={() => loadData()}
                  >
                    Search
                  </button>
                </div>
                {reportedContent.length > 0 && (
                  <div className="search-results">
                    <h4>Found {reportedContent.length} report(s)</h4>
                    <div className="reports-list">
                      {reportedContent.slice(0, 10).map((report) => (
                        <div key={report.id} className="report-item-small">
                          <div className="report-item-header">
                            <span className="report-type">{report.contentType}</span>
                            <span className="report-date">
                              {new Date(report.reportedAt || report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="report-item-content">
                            <span className="content-preview">
                              {report.contentPreview?.substring(0, 100) || 'No preview available'}...
                            </span>
                          </div>
                          <div className="report-item-actions">
                            <button
                              className="action-btn-small"
                              onClick={() => {
                                setActiveTab('reports');
                                // Scroll to this report
                              }}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="tool-card">
                <h3>🚨 Auto-Moderation</h3>
                <div className="auto-mod-settings">
                  <div className="setting-item">
                    <label>
                      <input type="checkbox" defaultChecked disabled />
                      Filter inappropriate language (Coming soon)
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>
                      <input type="checkbox" defaultChecked disabled />
                      Block spam content (Coming soon)
                    </label>
                  </div>
                  <div className="setting-item">
                    <label>
                      <input type="checkbox" disabled />
                      Require approval for new users (Coming soon)
                    </label>
                  </div>
                  <p className="info-text" style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Auto-moderation features are planned for a future update.
                  </p>
                </div>
              </div>

              <div className="tool-card">
                <h3>📊 Content Statistics</h3>
                <div className="content-stats">
                  <div className="stat-item">
                    <span className="stat-number">{moderationStats?.activeReports || 0}</span>
                    <span className="stat-label">Active Reports</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{moderationStats?.moderatedToday || 0}</span>
                    <span className="stat-label">Moderated Today</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{moderationStats?.contentRemoved || 0}</span>
                    <span className="stat-label">Removed Total</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{moderationStats?.contentApproved || 0}</span>
                    <span className="stat-label">Approved Total</span>
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
