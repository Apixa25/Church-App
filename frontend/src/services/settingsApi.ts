import axios from 'axios';

// Using the same API configuration as other services
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';
const API_URL = `${API_BASE_URL}/settings`;

// Local axios instance to attach Authorization automatically (aligns with other services)
const settingsClient = axios.create();
settingsClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types
export interface UserSettings {
  userId: string;

  // Notification Settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  prayerNotifications: boolean;
  announcementNotifications: boolean;
  eventNotifications: boolean;
  chatNotifications: boolean;
  donationReminders: boolean;
  weeklyDigest: boolean;

  // Privacy Settings
  profileVisibility: string;
  showDonationHistory: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  prayerRequestVisibility: string;

  // Appearance Settings
  theme: string;
  language: string;
  timezone: string;
  fontSize: string;

  // Communication Preferences
  preferredContactMethod: string;
  newsletterSubscription: boolean;
  eventRemindersHours: number;

  // Data & Privacy
  dataSharingAnalytics: boolean;
  autoBackupEnabled: boolean;
  lastBackupDate?: string;

  // Accessibility
  highContrastMode: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface SystemInfo {
  appVersion: string;
  buildDate?: string;
  platform: string;
  lastUpdated: string;
  runtime?: {
    javaVersion: string;
    totalMemory: number;
    freeMemory: number;
    maxMemory: number;
  };
}

export interface HelpCategory {
  id: string;
  title: string;
  icon: string;
}

export interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface HelpContent {
  categories: HelpCategory[];
  faqItems: FaqItem[];
  supportEmail: string;
  supportPhone: string;
}

export interface FeedbackRequest {
  type: string;
  subject: string;
  message: string;
  email: string;
}

// API Functions

// Settings Management
export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await settingsClient.get(API_URL);
  return response.data;
};

export const updateUserSettings = async (updates: Partial<UserSettings>): Promise<UserSettings> => {
  const response = await settingsClient.put(API_URL, updates);
  return response.data;
};

export const updateNotificationSettings = async (
  notificationSettings: Partial<UserSettings>
): Promise<{ message: string }> => {
  const response = await settingsClient.put(`${API_URL}/notifications`, notificationSettings);
  return response.data;
};

export const updatePrivacySettings = async (
  privacySettings: Partial<UserSettings>
): Promise<{ message: string }> => {
  const response = await settingsClient.put(`${API_URL}/privacy`, privacySettings);
  return response.data;
};

export const updateAppearanceSettings = async (
  appearanceSettings: Partial<UserSettings>
): Promise<{ message: string }> => {
  const response = await settingsClient.put(`${API_URL}/appearance`, appearanceSettings);
  return response.data;
};

// FCM and Notifications
export const registerFcmToken = async (token: string): Promise<{ message: string }> => {
  const response = await settingsClient.post(`${API_URL}/fcm-token`, { token });
  return response.data;
};

export const testNotification = async (): Promise<{ message: string }> => {
  const response = await settingsClient.post(`${API_URL}/test-notification`);
  return response.data;
};

// Data Management
export const exportUserData = async (format: string = 'json'): Promise<ArrayBuffer> => {
  const response = await settingsClient.get(`${API_URL}/export-data`, {
    params: { format },
    responseType: 'arraybuffer'
  });
  return response.data;
};

export const requestAccountDeletion = async (
  reason: string,
  password: string
): Promise<{ message: string; info: string }> => {
  const response = await settingsClient.post(`${API_URL}/delete-account`, {
    reason,
    password
  });
  return response.data;
};

export const createBackup = async (): Promise<{ message: string; backupId: string }> => {
  const response = await settingsClient.post(`${API_URL}/backup`);
  return response.data;
};

// System and Help
export const getSystemInfo = async (): Promise<SystemInfo> => {
  const response = await settingsClient.get(`${API_URL}/system-info`);
  return response.data;
};

export const getHelpContent = async (
  category?: string,
  search?: string
): Promise<HelpContent> => {
  const response = await settingsClient.get(`${API_URL}/help`, {
    params: { category, search }
  });
  return response.data;
};

export const submitFeedback = async (
  feedback: FeedbackRequest
): Promise<{ message: string; ticketId: string }> => {
  const response = await settingsClient.post(`${API_URL}/feedback`, feedback);
  return response.data;
};

export const resetToDefaults = async (): Promise<UserSettings> => {
  const response = await settingsClient.post(`${API_URL}/reset`);
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

// Theme application utility
export const applyTheme = (theme: string) => {
  const root = document.documentElement;

  switch (theme.toLowerCase()) {
    case 'dark':
      root.setAttribute('data-theme', 'dark');
      break;
    case 'auto':
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
      break;
    default:
      root.setAttribute('data-theme', 'light');
  }
};

// Font size application utility
export const applyFontSize = (fontSize: string) => {
  const root = document.documentElement;

  switch (fontSize.toLowerCase()) {
    case 'small':
      root.style.fontSize = '14px';
      break;
    case 'large':
      root.style.fontSize = '18px';
      break;
    case 'extra_large':
      root.style.fontSize = '20px';
      break;
    default: // medium
      root.style.fontSize = '16px';
  }
};

// Accessibility utilities
export const applyAccessibilitySettings = (settings: Partial<UserSettings>) => {
  const root = document.documentElement;

  if (settings.highContrastMode) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  if (settings.reduceMotion) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  if (settings.screenReaderOptimized) {
    root.classList.add('screen-reader-optimized');
  } else {
    root.classList.remove('screen-reader-optimized');
  }
};

// Export default object for convenience
export default {
  getUserSettings,
  updateUserSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  updateAppearanceSettings,
  registerFcmToken,
  testNotification,
  exportUserData,
  requestAccountDeletion,
  createBackup,
  getSystemInfo,
  getHelpContent,
  submitFeedback,
  resetToDefaults,
  handleApiError,
  applyTheme,
  applyFontSize,
  applyAccessibilitySettings
};