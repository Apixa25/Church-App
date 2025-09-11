import api from './api';
import { prayerAPI } from './prayerApi';

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  userDisplayName: string;
  userProfilePicUrl?: string;
  userId?: string;
  timestamp: string;
  actionUrl?: string;
  iconType: string;
  metadata?: any;
}

export interface DashboardStats {
  totalMembers: number;
  newMembersThisWeek: number;
  totalPrayerRequests: number;
  activePrayerRequests: number;
  answeredPrayerRequests: number;
  upcomingEvents: number;
  unreadAnnouncements: number;
  additionalStats: Record<string, any>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  actionUrl: string;
  iconType: string;
  buttonText: string;
  requiresAuth: boolean;
  requiredRole?: string;
}

export interface NotificationPreview {
  type: string;
  title: string;
  message: string;
  timestamp: string;
  actionUrl?: string;
}

export interface NotificationSummary {
  totalUnread: number;
  prayerRequests: number;
  announcements: number;
  chatMessages: number;
  events: number;
  previews: NotificationPreview[];
}

export interface DashboardResponse {
  recentActivity: DashboardActivityItem[];
  stats: DashboardStats;
  quickActions: QuickAction[];
  notifications: NotificationSummary;
  lastUpdated: string;
}

const dashboardApi = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getActivityFeed: async (): Promise<DashboardResponse> => {
    const response = await api.get('/dashboard/activity');
    return response.data;
  },

  getStats: async (): Promise<{ stats: DashboardStats; lastUpdated: string }> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },

  getNotifications: async (): Promise<{ notifications: NotificationSummary; lastUpdated: string }> => {
    const response = await api.get('/dashboard/notifications');
    return response.data;
  },

  getQuickActions: async (): Promise<{ quickActions: QuickAction[]; lastUpdated: string }> => {
    const response = await api.get('/dashboard/quick-actions');
    return response.data;
  },

  // Prayer Request specific dashboard functions
  getPrayerActivityItems: async (limit: number = 10): Promise<DashboardActivityItem[]> => {
    try {
      // Get recent prayer requests for dashboard
      const response = await prayerAPI.getAllPrayerRequests(0, limit);
      const prayers = response.data.content || response.data;
      
      return prayers.map(prayer => ({
        id: prayer.id,
        type: 'prayer_request',
        title: prayer.title,
        description: prayer.description || 'Prayer request submitted',
        userDisplayName: prayer.isAnonymous ? 'Anonymous' : prayer.userName,
        userProfilePicUrl: prayer.isAnonymous ? undefined : prayer.userProfilePicUrl,
        userId: prayer.isAnonymous ? undefined : prayer.userId,
        timestamp: prayer.createdAt,
        actionUrl: `/prayers/${prayer.id}`,
        iconType: 'prayer',
        metadata: {
          category: prayer.category,
          status: prayer.status,
          isAnonymous: prayer.isAnonymous,
          interactionCount: prayer.interactionSummary?.totalInteractions || 0
        }
      }));
    } catch (error) {
      console.error('Error fetching prayer activity items:', error);
      return [];
    }
  },

  getPrayerQuickActions: (): QuickAction[] => {
    return [
      {
        id: 'view-prayers',
        title: 'Prayer Requests',
        description: 'View, submit, and manage prayer requests with the community',
        actionUrl: '/prayers',
        iconType: 'prayer',
        buttonText: 'Prayer Requests',
        requiresAuth: true
      }
    ];
  },

  getDashboardWithPrayers: async (): Promise<DashboardResponse> => {
    try {
      // Get the main dashboard data
      const dashboardResponse = await api.get('/dashboard');
      const dashboardData = dashboardResponse.data;

      // Get prayer-specific activity items
      const prayerActivityItems = await dashboardApi.getPrayerActivityItems(5);

      // Merge prayer activities with existing activities
      const combinedActivity = [
        ...prayerActivityItems,
        ...(dashboardData.recentActivity || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 20); // Keep only the 20 most recent items

      // Add prayer quick actions if not already present
      const prayerQuickActions = dashboardApi.getPrayerQuickActions();
      const existingActionUrls = (dashboardData.quickActions || []).map((action: QuickAction) => action.actionUrl);
      const newPrayerActions = prayerQuickActions.filter(action => 
        !existingActionUrls.includes(action.actionUrl)
      );

      return {
        ...dashboardData,
        recentActivity: combinedActivity,
        quickActions: [...(dashboardData.quickActions || []), ...newPrayerActions]
      };
    } catch (error) {
      console.error('Error getting dashboard with prayers:', error);
      // Fallback to regular dashboard
      const response = await api.get('/dashboard');
      return response.data;
    }
  },
};

export default dashboardApi;