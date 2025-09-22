import React from 'react';
import { DashboardStats as StatsType } from '../services/dashboardApi';

interface DashboardStatsProps {
  stats: StatsType;
  isLoading?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="dashboard-stats loading">
        <h3>📈 Community Stats</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading stats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-stats">
      <h3>📈 Community Stats</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h4>{stats.totalMembers}</h4>
            <p>Total Members</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🆕</div>
          <div className="stat-content">
            <h4>{stats.newMembersThisWeek}</h4>
            <p>New This Week</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🙏</div>
          <div className="stat-content">
            <h4>{stats.activePrayerRequests || stats.totalPrayerRequests}</h4>
            <p>Active Prayers</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✨</div>
          <div className="stat-content">
            <h4>{stats.answeredPrayerRequests || 0}</h4>
            <p>Answered Prayers</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h4>{stats.upcomingEvents}</h4>
            <p>Upcoming Events</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📢</div>
          <div className="stat-content">
            <h4>{stats.unreadAnnouncements}</h4>
            <p>New Announcements</p>
          </div>
        </div>

        {/* Donation Stats */}
        {stats.additionalStats?.totalDonationsThisMonth && (
          <div className="stat-card">
            <div className="stat-icon">💝</div>
            <div className="stat-content">
              <h4>${Number(stats.additionalStats.totalDonationsThisMonth).toLocaleString()}</h4>
              <p>Donations This Month</p>
            </div>
          </div>
        )}

        {stats.additionalStats?.donationCountThisMonth && (
          <div className="stat-card">
            <div className="stat-icon">🎁</div>
            <div className="stat-content">
              <h4>{stats.additionalStats.donationCountThisMonth}</h4>
              <p>Donations Count</p>
            </div>
          </div>
        )}

        {stats.additionalStats?.uniqueDonorsThisMonth && (
          <div className="stat-card">
            <div className="stat-icon">🤝</div>
            <div className="stat-content">
              <h4>{stats.additionalStats.uniqueDonorsThisMonth}</h4>
              <p>Generous Donors</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardStats;