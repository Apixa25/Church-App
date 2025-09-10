import axios from 'axios';

const API_BASE_URL = 'http://localhost:8083/api';

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
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  getActivityFeed: async (): Promise<DashboardResponse> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/dashboard/activity`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  getStats: async (): Promise<{ stats: DashboardStats; lastUpdated: string }> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  getNotifications: async (): Promise<{ notifications: NotificationSummary; lastUpdated: string }> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/dashboard/notifications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  getQuickActions: async (): Promise<{ quickActions: QuickAction[]; lastUpdated: string }> => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_BASE_URL}/dashboard/quick-actions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },
};

export default dashboardApi;