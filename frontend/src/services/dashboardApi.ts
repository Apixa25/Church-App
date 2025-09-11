import api from './api';
import { prayerAPI } from './prayerApi';
import { announcementAPI } from './announcementApi';

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

  // Announcement specific dashboard functions
  getAnnouncementActivityItems: async (limit: number = 10): Promise<DashboardActivityItem[]> => {
    try {
      // Get recent announcements for dashboard
      const response = await announcementAPI.getAnnouncementsForFeed(limit);
      const announcements = response.data;
      
      return announcements.map(announcement => ({
        id: announcement.id,
        type: 'announcement',
        title: announcement.title,
        description: announcement.content.length > 100 
          ? announcement.content.substring(0, 100) + '...' 
          : announcement.content,
        userDisplayName: announcement.userName,
        userProfilePicUrl: announcement.userProfilePicUrl,
        userId: announcement.userId,
        timestamp: announcement.createdAt,
        actionUrl: `/announcements/${announcement.id}`,
        iconType: 'announcement',
        metadata: {
          category: announcement.category,
          isPinned: announcement.isPinned,
          userRole: announcement.userRole
        }
      }));
    } catch (error) {
      console.error('Error fetching announcement activity items:', error);
      return [];
    }
  },

  getAnnouncementQuickActions: (userRole?: string): QuickAction[] => {
    const actions: QuickAction[] = [
      {
        id: 'view-announcements',
        title: 'Announcements',
        description: 'View church announcements and important updates',
        actionUrl: '/announcements',
        iconType: 'announcement',
        buttonText: 'View Announcements',
        requiresAuth: true
      }
    ];

    // Add create action for admins and moderators
    if (userRole === 'ADMIN' || userRole === 'MODERATOR') {
      actions.push({
        id: 'create-announcement',
        title: 'New Announcement',
        description: 'Create a new church announcement',
        actionUrl: '/announcements/create',
        iconType: 'create',
        buttonText: 'New Announcement',
        requiresAuth: true,
        requiredRole: 'ADMIN,MODERATOR'
      });
    }

    return actions;
  },

  getDashboardWithPrayers: async (): Promise<DashboardResponse> => {
    try {
      // Get the main dashboard data
      const dashboardResponse = await api.get('/dashboard');
      const dashboardData = dashboardResponse.data;

      // Get prayer-specific activity items
      const prayerActivityItems = await dashboardApi.getPrayerActivityItems(5);

      // Get announcement-specific activity items
      const announcementActivityItems = await dashboardApi.getAnnouncementActivityItems(5);

      // Merge all activities with existing activities
      const combinedActivity = [
        ...prayerActivityItems,
        ...announcementActivityItems,
        ...(dashboardData.recentActivity || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 20); // Keep only the 20 most recent items

      // Add prayer and announcement quick actions if not already present
      const prayerQuickActions = dashboardApi.getPrayerQuickActions();
      const announcementQuickActions = dashboardApi.getAnnouncementQuickActions(
        dashboardData.userRole || localStorage.getItem('userRole')
      );
      
      const existingActionUrls = (dashboardData.quickActions || []).map((action: QuickAction) => action.actionUrl);
      const newActions = [...prayerQuickActions, ...announcementQuickActions].filter(action => 
        !existingActionUrls.includes(action.actionUrl)
      );

      return {
        ...dashboardData,
        recentActivity: combinedActivity,
        quickActions: [...(dashboardData.quickActions || []), ...newActions]
      };
    } catch (error) {
      console.error('Error getting dashboard with prayers and announcements:', error);
      // Fallback to regular dashboard
      const response = await api.get('/dashboard');
      return response.data;
    }
  },
};

export default dashboardApi;