import api from './api';

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
  phone?: string;
}

// API Functions

// Settings Management
export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateUserSettings = async (updates: Partial<UserSettings>): Promise<UserSettings> => {
  const response = await api.put('/settings', updates);
  return response.data;
};

export const updateNotificationSettings = async (
  notificationSettings: Partial<UserSettings>
): Promise<{ message: string }> => {
  const response = await api.put('/settings/notifications', notificationSettings);
  return response.data;
};

export const updatePrivacySettings = async (
  privacySettings: Partial<UserSettings>
): Promise<{ message: string }> => {
  console.log('📡 [API Debug] updatePrivacySettings called');
  console.log('📡 [API Debug] Request payload:', privacySettings);
  console.log('📡 [API Debug] Making PUT request to /settings/privacy');
  console.log('📡 [API Debug] API base URL:', api.defaults.baseURL);
  
  try {
    const startTime = Date.now();
    const response = await api.put('/settings/privacy', privacySettings);
    const duration = Date.now() - startTime;
    
    console.log('📡 [API Debug] Response received in', duration, 'ms');
    console.log('📡 [API Debug] Response status:', response.status);
    console.log('📡 [API Debug] Response status text:', response.statusText);
    console.log('📡 [API Debug] Response headers:', response.headers);
    console.log('📡 [API Debug] Response data:', response.data);
    console.log('✅ [API Debug] API call successful');
    
    return response.data;
  } catch (error: any) {
    console.error('📡 [API Debug] API Error occurred');
    console.error('📡 [API Debug] Error type:', typeof error);
    console.error('📡 [API Debug] Error object:', error);
    console.error('📡 [API Debug] Error message:', error?.message);
    console.error('📡 [API Debug] Error response exists:', !!error?.response);
    
    if (error?.response) {
      console.error('📡 [API Debug] Response status:', error.response.status);
      console.error('📡 [API Debug] Response status text:', error.response.statusText);
      console.error('📡 [API Debug] Response data:', error.response.data);
      console.error('📡 [API Debug] Response headers:', error.response.headers);
    }
    
    if (error?.request) {
      console.error('📡 [API Debug] Request was made but no response received');
      console.error('📡 [API Debug] Request config:', error.config);
    }
    
    console.error('❌ [API Debug] API call failed');
    throw error;
  }
};

export const updateAppearanceSettings = async (
  appearanceSettings: Partial<UserSettings>
): Promise<{ message: string }> => {
  const response = await api.put('/settings/appearance', appearanceSettings);
  return response.data;
};

// FCM and Notifications
export const registerFcmToken = async (token: string): Promise<{ message: string }> => {
  const response = await api.post('/settings/fcm-token', { token });
  return response.data;
};

export const testNotification = async (): Promise<{ message: string }> => {
  const response = await api.post('/settings/test-notification');
  return response.data;
};

// Data Management
export const exportUserData = async (format: string = 'json'): Promise<ArrayBuffer> => {
  const response = await api.get('/settings/export-data', {
    params: { format },
    responseType: 'arraybuffer'
  });
  return response.data;
};

export const requestAccountDeletion = async (
  reason: string,
  password: string
): Promise<{ message: string; info: string }> => {
  const response = await api.post('/settings/delete-account', {
    reason,
    password
  });
  return response.data;
};

export const createBackup = async (): Promise<{ message: string; backupId: string }> => {
  const response = await api.post('/settings/backup');
  return response.data;
};

// System and Help
export const getSystemInfo = async (): Promise<SystemInfo> => {
  const response = await api.get('/settings/system-info');
  return response.data;
};

export const getHelpContent = async (
  category?: string,
  search?: string
): Promise<HelpContent> => {
  const response = await api.get('/settings/help', {
    params: { category, search }
  });
  return response.data;
};

export const submitFeedback = async (
  feedback: FeedbackRequest
): Promise<{ message: string; ticketId: string }> => {
  console.log('📡 [Feedback Debug] settingsApi.submitFeedback called', {
    type: feedback?.type,
    subject: feedback?.subject,
    messageLength: feedback?.message?.length || 0,
    email: feedback?.email,
    phone: feedback?.phone
  });
  const response = await api.post('/settings/feedback', feedback);
  console.log('📡 [Feedback Debug] settingsApi.submitFeedback response', {
    status: response.status,
    data: response.data
  });
  return response.data;
};

export const resetToDefaults = async (): Promise<UserSettings> => {
  const response = await api.post('/settings/reset');
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
  const themeLower = theme.toLowerCase();

  // Save to localStorage for instant loading on next visit
  localStorage.setItem('app-theme', themeLower);

  switch (themeLower) {
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
    case 'light':
      root.setAttribute('data-theme', 'light');
      break;
    default:
      root.setAttribute('data-theme', 'dark');
  }
};

// Font size application utility
export const applyFontSize = (fontSize: string) => {
  const root = document.documentElement;
  const fontSizeLower = fontSize.toLowerCase();

  // Save to localStorage for instant loading on next visit
  localStorage.setItem('app-font-size', fontSizeLower);

  switch (fontSizeLower) {
    case 'small':
      root.style.fontSize = '14px';
      break;
    case 'large':
      root.style.fontSize = '18px';
      break;
    default: // medium
      root.style.fontSize = '16px';
  }
};

// Apply stored settings from localStorage on app load (instant, no API call)
export const applyStoredSettings = () => {
  const storedTheme = localStorage.getItem('app-theme');
  const storedFontSize = localStorage.getItem('app-font-size');

  // Apply dark theme by default if no theme is stored
  if (storedTheme) {
    applyTheme(storedTheme);
  } else {
    // Default to dark theme
    applyTheme('dark');
  }

  if (storedFontSize) {
    applyFontSize(storedFontSize);
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
  applyAccessibilitySettings,
  applyStoredSettings
};