import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useActiveContext } from '../contexts/ActiveContextContext';
import dashboardApi, { DashboardStats } from '../services/dashboardApi';
import LoadingSpinner from './LoadingSpinner';
import './CommunityStatsModal.css';

interface CommunityStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommunityStatsModal: React.FC<CommunityStatsModalProps> = ({ isOpen, onClose }) => {
  const { activeOrganizationId, hasAnyPrimary } = useActiveContext();

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['communityStats', activeOrganizationId],
    queryFn: async (): Promise<DashboardStats> => {
      // getDashboardWithAll(hasPrimaryOrgOverride?: boolean, organizationId?: string)
      const dashboardData = await dashboardApi.getDashboardWithAll(hasAnyPrimary, activeOrganizationId || undefined);
      return dashboardData.stats;
    },
    enabled: isOpen && hasAnyPrimary, // Only fetch when modal is open and user has org
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

  // If user doesn't have a primary organization
  if (!hasAnyPrimary) {
    const modalContent = (
      <div className="community-stats-modal-overlay" onClick={onClose}>
        <div className="community-stats-modal-container community-stats-clickable" onClick={onClose}>
          <div className="community-stats-modal-content">
            <h2>📈 Community Stats</h2>
            <div className="community-stats-no-org">
              <p>🏠 Join an organization to see community stats!</p>
              <p className="hint">Browse and join a church or family group to unlock this feature.</p>
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

