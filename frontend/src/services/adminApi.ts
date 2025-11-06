import axios from 'axios';
// Using the same API configuration as other services
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';

const API_URL = `${API_BASE_URL}/admin`;

// Create axios instance with authentication interceptors
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  profilePicUrl?: string;
  bio?: string;
  isActive: boolean;
  isBanned: boolean;
  warningCount: number;
  createdAt: string;
  lastLogin?: string;
  bannedAt?: string;
  banReason?: string;
  totalPosts: number;
  totalComments: number;
  totalPrayers: number;
  totalDonations: number;
}

export interface AdminAnalytics {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  bannedUsers: number;

  // Content metrics
  totalPosts: number;
  totalComments: number;
  totalPrayers: number;
  totalAnnouncements: number;
  totalEvents: number;
  totalResources: number;

  // Activity metrics
  postsToday: number;
  commentsToday: number;
  prayersToday: number;
  activeChats: number;
  messagesThisWeek: number;

  // Moderation metrics
  totalReports: number;
  activeReports: number;
  resolvedReports: number;
  contentRemoved: number;
  warningsIssued: number;

  // Engagement metrics
  averageUserActivity: number;
  prayerEngagementRate: number;
  eventAttendanceRate: number;
  topCategories: Record<string, number>;

  // Financial metrics
  totalDonations: number;
  donationsThisMonth: number;
  uniqueDonors: number;
  averageDonation: number;

  // System metrics
  totalAuditLogs: number;
  auditActionCounts: Record<string, number>;
  popularContent: PopularContent[];
  topContributors: UserActivitySummary[];

  // Charts data
  userGrowthChart: ChartDataPoint[];
  activityChart: ChartDataPoint[];
  donationChart: ChartDataPoint[];
}

export interface PopularContent {
  type: string;
  title: string;
  author: string;
  interactions: number;
  createdAt: string;
}

export interface UserActivitySummary {
  userName: string;
  userEmail: string;
  totalContributions: number;
  primaryActivity: string;
  lastActive: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, string>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  targetType?: string;
  targetId?: string;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  database: string;
  totalUsers: number;
  activeUsers: number;
  systemLoad: string;
  memoryUsage: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// API Functions

// User Management
export const getUsers = async (params: {
  page?: number;
  size?: number;
  search?: string;
  role?: string;
  banned?: boolean | null;
}): Promise<PageResponse<User>> => {
  const response = await adminApi.get(`${API_URL}/users`, { params });
  return response.data;
};

export const getUserDetails = async (userId: string): Promise<User> => {
  const response = await adminApi.get(`${API_URL}/users/${userId}`);
  return response.data;
};

export const updateUserRole = async (
  userId: string,
  role: string,
  reason?: string
): Promise<{ message: string; newRole: string }> => {
  const response = await adminApi.put(`${API_URL}/users/${userId}/role`, {
    role,
    reason
  });
  return response.data;
};

export const banUser = async (
  userId: string,
  reason: string,
  duration?: string
): Promise<{ message: string; reason: string }> => {
  const response = await adminApi.post(`${API_URL}/users/${userId}/ban`, {
    reason,
    duration
  });
  return response.data;
};

export const unbanUser = async (
  userId: string,
  reason?: string
): Promise<{ message: string }> => {
  const response = await adminApi.post(`${API_URL}/users/${userId}/unban`, {
    reason
  });
  return response.data;
};

export const warnUser = async (
  userId: string,
  reason: string,
  message?: string
): Promise<{ message: string }> => {
  const response = await adminApi.post(`${API_URL}/users/${userId}/warn`, {
    reason,
    message
  });
  return response.data;
};

export const deleteUser = async (
  userId: string,
  reason: string
): Promise<{ message: string }> => {
  const response = await adminApi.delete(`${API_URL}/users/${userId}`, {
    data: { reason }
  });
  return response.data;
};

// Analytics
export const getAdminAnalytics = async (timeRange: string = '30d'): Promise<AdminAnalytics> => {
  const response = await adminApi.get(`${API_URL}/analytics`, {
    params: { timeRange }
  });
  return response.data;
};

export const getUserAnalytics = async (timeRange: string = '30d'): Promise<Record<string, any>> => {
  const response = await adminApi.get(`${API_URL}/analytics/users`, {
    params: { timeRange }
  });
  return response.data;
};

export const getContentAnalytics = async (timeRange: string = '30d'): Promise<Record<string, any>> => {
  const response = await adminApi.get(`${API_URL}/analytics/content`, {
    params: { timeRange }
  });
  return response.data;
};

// Audit Logs
export const getAuditLogs = async (params: {
  page?: number;
  size?: number;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PageResponse<AuditLog>> => {
  const response = await adminApi.get(`${API_URL}/audit-logs`, { params });
  return response.data;
};

export const getAuditStats = async (timeRange: string = '30d'): Promise<{
  actionCounts: Record<string, number>;
  availableActions: string[];
  timeRange: string;
}> => {
  const response = await adminApi.get(`${API_URL}/audit-logs/stats`, {
    params: { timeRange }
  });
  return response.data;
};

// System Health
export const getSystemHealth = async (): Promise<SystemHealth> => {
  const response = await adminApi.get(`${API_URL}/health`);
  return response.data;
};

// Content Moderation
export const getReportedContent = async (params: {
  page?: number;
  size?: number;
  contentType?: string;
  status?: string;
  priority?: string;
}): Promise<PageResponse<any>> => {
  const response = await adminApi.get(`${API_URL}/moderation/reports`, { params });
  return response.data;
};

export const moderateContent = async (
  contentType: string,
  contentId: string,
  action: string,
  reason?: string
): Promise<{ message: string; action: string; contentType: string }> => {
  const response = await adminApi.post(`${API_URL}/moderation/content/${contentType}/${contentId}/moderate`, {
    action,
    reason
  });
  return response.data;
};

export const reportContent = async (
  contentType: string,
  contentId: string,
  reason: string,
  description?: string
): Promise<{ message: string }> => {
  const response = await adminApi.post(`${API_URL}/moderation/content/${contentType}/${contentId}/report`, {
    reason,
    description
  });
  return response.data;
};

export const getModerationStats = async (timeRange: string = '30d'): Promise<Record<string, any>> => {
  const response = await adminApi.get(`${API_URL}/moderation/stats`, {
    params: { timeRange }
  });
  return response.data;
};

export const getFlaggedContent = async (params: {
  page?: number;
  size?: number;
  contentType?: string;
}): Promise<PageResponse<any>> => {
  const response = await adminApi.get(`${API_URL}/moderation/flagged`, { params });
  return response.data;
};

export const bulkModerate = async (
  contentIds: string[],
  action: string,
  reason?: string
): Promise<{
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: string[];
}> => {
  const response = await adminApi.post(`${API_URL}/moderation/bulk-moderate`, {
    contentIds,
    action,
    reason
  });
  return response.data;
};

export const updateModerationSettings = async (
  settings: Record<string, any>
): Promise<{ message: string }> => {
  const response = await adminApi.put(`${API_URL}/moderation/settings`, settings);
  return response.data;
};

export const getModerationHistory = async (
  contentType: string,
  contentId: string
): Promise<Array<Record<string, any>>> => {
  const response = await adminApi.get(`${API_URL}/moderation/content/${contentType}/${contentId}/history`);
  return response.data;
};

// Utility function to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Export default object for convenience
export default {
  // User Management
  getUsers,
  getUserDetails,
  updateUserRole,
  banUser,
  unbanUser,
  warnUser,
  deleteUser,

  // Analytics
  getAdminAnalytics,
  getUserAnalytics,
  getContentAnalytics,

  // Audit Logs
  getAuditLogs,
  getAuditStats,

  // System Health
  getSystemHealth,

  // Content Moderation
  getReportedContent,
  moderateContent,
  reportContent,
  getModerationStats,
  getFlaggedContent,
  bulkModerate,
  updateModerationSettings,
  getModerationHistory,

  // Utilities
  handleApiError
};