import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import dashboardApi, { DashboardResponse } from '../services/dashboardApi';
import ActivityFeed from './ActivityFeed';
import QuickActions from './QuickActions';
import DashboardStats from './DashboardStats';
import NotificationCenter from './NotificationCenter';
import PrayerNotifications from './PrayerNotifications';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use enhanced dashboard service that includes prayer requests
      const data = await dashboardApi.getDashboardWithPrayers();
      setDashboardData(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const formatLastRefresh = () => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastRefresh.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 minute ago';
    return `${diffInMinutes} minutes ago`;
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🏛️ Church App</h1>
            <div className="refresh-info">
              <span>Last updated: {formatLastRefresh()}</span>
              <button onClick={handleRefresh} className="refresh-btn" disabled={isLoading}>
                {isLoading ? '🔄' : '↻'} Refresh
              </button>
            </div>
          </div>
          <div className="user-info">
            <div className="user-details">
              {user?.profilePicUrl && (
                <img 
                  src={user.profilePicUrl} 
                  alt={user.name}
                  className="profile-pic"
                />
              )}
              <div>
                <p className="user-name">👋 Welcome, {user?.name}!</p>
                <p className="user-role">Role: {user?.role}</p>
              </div>
            </div>
            <div className="header-actions">
              <PrayerNotifications />
              <button onClick={handleLogout} className="logout-button">
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={handleRefresh}>Try Again</button>
          </div>
        )}

        <div className="dashboard-layout">
          {/* Left Column - Activity Feed */}
          <div className="dashboard-left">
            <div className="dashboard-card">
              <ActivityFeed 
                activities={dashboardData?.recentActivity || []} 
                isLoading={isLoading} 
              />
            </div>
          </div>

          {/* Right Column - Stats, Actions, Notifications */}
          <div className="dashboard-right">
            <div className="dashboard-card">
              <DashboardStats 
                stats={dashboardData?.stats || {
                  totalMembers: 0,
                  newMembersThisWeek: 0,
                  totalPrayerRequests: 0,
                  upcomingEvents: 0,
                  unreadAnnouncements: 0,
                  additionalStats: {}
                }} 
                isLoading={isLoading} 
              />
            </div>

            <div className="dashboard-card">
              <QuickActions 
                actions={dashboardData?.quickActions || []} 
                isLoading={isLoading} 
              />
            </div>

            <div className="dashboard-card">
              <NotificationCenter 
                notifications={dashboardData?.notifications || {
                  totalUnread: 0,
                  prayerRequests: 0,
                  announcements: 0,
                  chatMessages: 0,
                  events: 0,
                  previews: []
                }} 
                isLoading={isLoading} 
              />
            </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className="status-banner">
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 1: Authentication</span>
          </div>
          <div className="status-item completed">
            <span className="status-icon">✅</span>
            <span>Section 2: User Profiles</span>
          </div>
          <div className="status-item current">
            <span className="status-icon">🚀</span>
            <span>Section 3: Home/Dashboard - COMPLETE!</span>
          </div>
          <div className="status-item upcoming">
            <span className="status-icon">⏳</span>
            <span>Next: Group Chats & Social Network</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;