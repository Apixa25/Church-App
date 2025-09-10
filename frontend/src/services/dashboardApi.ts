import api from './api';

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
};

export default dashboardApi;