import React, { useState, useEffect } from 'react';
import { getProfileViews, getFollowerGrowth } from '../services/postApi';
import { UserProfile } from '../types/Profile';
import ClickableAvatar from './ClickableAvatar';
import FollowerGrowthChart from './FollowerGrowthChart';
import './ProfileAnalytics.css';

interface ProfileAnalyticsProps {
  userId: string;
  isOwnProfile: boolean;
}

const ProfileAnalytics: React.FC<ProfileAnalyticsProps> = ({ userId, isOwnProfile }) => {
  const [activeTab, setActiveTab] = useState<'views' | 'growth'>('views');
  const [profileViews, setProfileViews] = useState<any[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsError, setViewsError] = useState<string>('');
  const [viewsStats, setViewsStats] = useState<any>(null);
  const [page, setPage] = useState(0);
  const [hasMoreViews, setHasMoreViews] = useState(true);
  
  const [growthData, setGrowthData] = useState<any>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthError, setGrowthError] = useState<string>('');
  const [growthDays, setGrowthDays] = useState(30);

  const USERS_PER_PAGE = 20;

  useEffect(() => {
    if (isOwnProfile && activeTab === 'views') {
      loadProfileViews(true);
    } else if (isOwnProfile && activeTab === 'growth') {
      loadFollowerGrowth();
    }
  }, [activeTab, isOwnProfile, userId]);

  const loadProfileViews = async (reset: boolean = false) => {
    try {
      setViewsLoading(true);
      setViewsError('');

      const currentPage = reset ? 0 : page;
      const response = await getProfileViews(currentPage, USERS_PER_PAGE);

      if (reset) {
        setProfileViews(response.content || []);
        setPage(1);
      } else {
        setProfileViews(prev => [...prev, ...(response.content || [])]);
        setPage(prev => prev + 1);
      }

      setViewsStats(response.stats || {});
      setHasMoreViews(
        response.currentPage !== undefined &&
        response.currentPage < (response.totalPages || 0) - 1
      );
    } catch (err: any) {
      console.error('Error loading profile views:', err);
      setViewsError('Failed to load profile views');
    } finally {
      setViewsLoading(false);
    }
  };

  const loadFollowerGrowth = async () => {
    try {
      setGrowthLoading(true);
      setGrowthError('');

      const data = await getFollowerGrowth(growthDays);
      setGrowthData(data);
    } catch (err: any) {
      console.error('Error loading follower growth:', err);
      setGrowthError('Failed to load follower growth data');
    } finally {
      setGrowthLoading(false);
    }
  };

  if (!isOwnProfile) {
    return null; // Only show analytics to profile owner
  }

  return (
    <div className="profile-analytics">
      <div className="analytics-tabs">
        <button
          className={`analytics-tab ${activeTab === 'views' ? 'active' : ''}`}
          onClick={() => setActiveTab('views')}
        >
          👁️ Profile Views
        </button>
        <button
          className={`analytics-tab ${activeTab === 'growth' ? 'active' : ''}`}
          onClick={() => setActiveTab('growth')}
        >
          📈 Follower Growth
        </button>
      </div>

      {activeTab === 'views' && (
        <div className="analytics-content">
          {viewsStats && (
            <div className="views-stats-summary">
              <div className="stat-card">
                <div className="stat-value">{viewsStats.totalViews || 0}</div>
                <div className="stat-label">Total Views</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{viewsStats.uniqueViewers || 0}</div>
                <div className="stat-label">Unique Viewers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{viewsStats.viewsToday || 0}</div>
                <div className="stat-label">Today</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{viewsStats.viewsThisWeek || 0}</div>
                <div className="stat-label">This Week</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{viewsStats.viewsThisMonth || 0}</div>
                <div className="stat-label">This Month</div>
              </div>
            </div>
          )}

          {viewsError && (
            <div className="error-message">{viewsError}</div>
          )}

          {profileViews.length === 0 && !viewsLoading ? (
            <div className="empty-state">
              <div className="empty-icon">👁️</div>
              <p>No profile views yet</p>
              <small>When people visit your profile, they'll appear here</small>
            </div>
          ) : (
            <div className="profile-views-list">
              {profileViews.map((view: any) => (
                <div key={view.id} className="profile-view-item">
                  <ClickableAvatar
                    userId={view.viewer?.userId || view.viewer?.id}
                    src={view.viewer?.profilePicUrl}
                    alt={view.viewer?.name}
                    size={48}
                  />
                  <div className="view-info">
                    <div className="viewer-name">{view.viewer?.name}</div>
                    <div className="view-date">
                      {new Date(view.viewedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewsLoading && (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading profile views...</span>
            </div>
          )}

          {hasMoreViews && !viewsLoading && profileViews.length > 0 && (
            <button
              className="load-more-btn"
              onClick={() => loadProfileViews(false)}
            >
              Load More
            </button>
          )}
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="analytics-content">
          <div className="growth-controls">
            <label>Time Period:</label>
            <select
              value={growthDays}
              onChange={(e) => {
                setGrowthDays(Number(e.target.value));
                loadFollowerGrowth();
              }}
              className="growth-period-select"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={365}>Last Year</option>
            </select>
          </div>

          {growthError && (
            <div className="error-message">{growthError}</div>
          )}

          {growthLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <span>Loading growth data...</span>
            </div>
          ) : growthData ? (
            <div className="growth-content">
              <div className="growth-summary">
                <div className="growth-stat">
                  <div className="growth-value">{growthData.currentFollowers || 0}</div>
                  <div className="growth-label">Current Followers</div>
                </div>
                <div className="growth-stat">
                  <div className={`growth-value ${growthData.growth >= 0 ? 'positive' : 'negative'}`}>
                    {growthData.growth >= 0 ? '+' : ''}{growthData.growth || 0}
                  </div>
                  <div className="growth-label">Growth</div>
                </div>
                <div className="growth-stat">
                  <div className={`growth-value ${growthData.growthRate >= 0 ? 'positive' : 'negative'}`}>
                    {growthData.growthRate >= 0 ? '+' : ''}{growthData.growthRate?.toFixed(1) || 0}%
                  </div>
                  <div className="growth-label">Growth Rate</div>
                </div>
              </div>

              <FollowerGrowthChart data={growthData.chartData || []} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <p>No growth data available yet</p>
              <small>Growth data will appear after you've been on the platform for a few days</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileAnalytics;

