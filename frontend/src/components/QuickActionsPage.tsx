import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import QuickActions from './QuickActions';
import CommunityStatsModal from './CommunityStatsModal';
import dashboardApi, { QuickAction } from '../services/dashboardApi';
import { useActiveContext } from '../contexts/ActiveContextContext';
import api from '../services/api';
import './QuickActionsPage.css';

const QuickActionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasAnyPrimary, activeOrganizationId } = useActiveContext();
  const [showStatsModal, setShowStatsModal] = useState(false);

  // 🚀 React Query - Smart caching with stale-while-revalidate
  const { data: quickActions = [], isLoading } = useQuery({
    queryKey: ['quickActions', activeOrganizationId, hasAnyPrimary],
    queryFn: async (): Promise<QuickAction[]> => {
      // 🚀 PERFORMANCE FIX: Use dedicated endpoint instead of full dashboard
      // This avoids fetching all dashboard data, activity items, stats, etc.
      const params = activeOrganizationId ? { organizationId: activeOrganizationId } : {};
      const response = await api.get('/dashboard/quick-actions', { params });
      let actions: QuickAction[] = response.data.quickActions || [];
      
      // Add organization-specific quick actions if user has primary org
      if (hasAnyPrimary) {
        const existingActionUrls = actions.map((action) => action.actionUrl);
        
        // Get userRole from localStorage (same approach as getDashboardWithAll)
        const userRole = localStorage.getItem('userRole') || undefined;
        
        const prayerQuickActions = dashboardApi.getPrayerQuickActions();
        const announcementQuickActions = dashboardApi.getAnnouncementQuickActions(userRole);
        const eventQuickActions = dashboardApi.getEventQuickActions();
        const resourceQuickActions = dashboardApi.getResourceQuickActions();
        const donationQuickActions = dashboardApi.getDonationQuickActions(userRole);
        const worshipQuickActions = dashboardApi.getWorshipQuickActions();
        const marketplaceQuickActions = dashboardApi.getMarketplaceQuickActions();

        const newActions = [
          ...prayerQuickActions,
          ...announcementQuickActions,
          ...eventQuickActions,
          ...resourceQuickActions,
          ...donationQuickActions,
          ...worshipQuickActions,
          ...marketplaceQuickActions
        ].filter(action => !existingActionUrls.includes(action.actionUrl));

        actions = [...actions, ...newActions];
      }
      
      return actions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    // This will:
    // 1. Check cache first - if data exists and is fresh, use it immediately (no loading!)
    // 2. Show cached data while fetching fresh data in background
    // 3. Only show loading if no cached data exists
  });

  return (
    <div className="quick-actions-page">
      <header className="quick-actions-header">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1>Quick Actions</h1>
      </header>

      <main className="quick-actions-content">
        {/* Community Stats Quick Access Button */}
        <div className="community-stats-quick-action">
          <button
            className="community-stats-button"
            onClick={() => setShowStatsModal(true)}
            aria-label="View Community Stats"
          >
            <span className="stats-icon">📊</span>
            <span className="stats-text">Community Stats</span>
          </button>
        </div>

        {/* Activity Feed Quick Access Button */}
        <div className="activity-feed-quick-action">
          <button
            className="activity-feed-button"
            onClick={() => navigate('/dashboard?view=activity')}
            aria-label="View Activity Feed"
          >
            <span className="activity-icon">📋</span>
            <span className="activity-text">Activity Feed</span>
          </button>
        </div>

        <QuickActions
          actions={quickActions}
          isLoading={isLoading}
        />
      </main>

      {/* Community Stats Modal */}
      <CommunityStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
  );
};

export default QuickActionsPage;
