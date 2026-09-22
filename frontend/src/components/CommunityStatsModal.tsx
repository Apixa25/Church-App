import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '../contexts/OrganizationContext';
import dashboardApi, { DashboardStats } from '../services/dashboardApi';
import LoadingSpinner from './LoadingSpinner';
import './CommunityStatsModal.css';

interface CommunityStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommunityStatsModal: React.FC<CommunityStatsModalProps> = ({ isOpen, onClose }) => {
  const { churchPrimary, loading: organizationsLoading } = useOrganization();
  const churchOrganizationId = churchPrimary?.organizationId || null;

  // Community stats are the locked church, even if the feed is showing something else.
  const { data: stats, isLoading } = useQuery({
    queryKey: ['communityStats', churchOrganizationId],
    queryFn: async (): Promise<DashboardStats> => {
      const dashboardData = await dashboardApi.getDashboardWithAll(true, churchOrganizationId || undefined);
      return dashboardData.stats;
    },
    enabled: isOpen && !!churchOrganizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (!churchPrimary) {
    const waiting = organizationsLoading;
    const modalContent = (
      <div className="community-stats-modal-overlay" onClick={onClose}>
        <div className="community-stats-modal-container community-stats-clickable" onClick={onClose}>
          <div className="community-stats-modal-content">
            <h2>📈 Community Stats</h2>
            <div className="community-stats-no-org">
              <p>{waiting ? 'Loading your church…' : 'Join a church to see community stats.'}</p>
              {!waiting && (
                <p className="hint">Stats stay with your primary church. Your family stays on the feed and in messages.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
    return createPortal(modalContent, document.body);
  }

  const modalContent = (
    <div className="community-stats-modal-overlay" onClick={onClose}>
      <div className="community-stats-modal-container community-stats-clickable" onClick={onClose}>
        
        <div className="community-stats-modal-content">
          <h2>📈 Community Stats</h2>
          
          {isLoading ? (
            <div className="community-stats-loading">
              <LoadingSpinner type="multi-ring" size="medium" text="Loading stats..." />
            </div>
          ) : stats ? (
            <div className="community-stats-grid">
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

              <div className="stat-card">
                <div className="stat-icon">💝</div>
                <div className="stat-content">
                  <h4>${Number(stats.additionalStats?.totalDonationsThisMonth || 0).toLocaleString()}</h4>
                  <p>Donations This Month</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🎁</div>
                <div className="stat-content">
                  <h4>{stats.additionalStats?.donationCountThisMonth || 0}</h4>
                  <p>Donations Count</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🤝</div>
                <div className="stat-content">
                  <h4>{stats.additionalStats?.uniqueDonorsThisMonth || 0}</h4>
                  <p>Generous Donors</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="community-stats-error">
              <p>Unable to load stats. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CommunityStatsModal;

