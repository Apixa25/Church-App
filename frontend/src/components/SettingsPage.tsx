import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import {
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
  UserSettings,
  SystemInfo,
  HelpContent,
  handleApiError
} from '../services/settingsApi';
import AccountDeletionModal from './AccountDeletionModal';
import ConfirmationModal from './ConfirmationModal';
import './SettingsPage.css';

interface SettingsPageProps {
  initialTab?: 'notifications' | 'privacy' | 'appearance' | 'account' | 'help' | 'about';
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  initialTab = 'notifications'
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab || initialTab);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [helpContent, setHelpContent] = useState<HelpContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHelpCategory, setSelectedHelpCategory] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Update activeTab when route parameter changes
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');

      const [settingsData, systemData] = await Promise.all([
        getUserSettings(),
        getSystemInfo()
      ]);

      setSettings(settingsData);
      setSystemInfo(systemData);

      if (activeTab === 'help') {
        const helpData = await getHelpContent(selectedHelpCategory, searchQuery);
        setHelpContent(helpData);
      }
    } catch (err: any) {
      console.error('Error loading settings data:', err);
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to load settings. Please refresh the page or try again later.');
      setTimeout(() => setError(''), 7000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (updates: Partial<UserSettings>) => {
    try {
      setIsSaving(true);
      setError('');

      const updatedSettings = await updateUserSettings(updates);
      setSettings(updatedSettings);
      setSuccessMessage('Settings saved successfully! ✅');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to save settings. Please check your connection and try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationUpdate = async (notificationSettings: any) => {
    try {
      setIsSaving(true);
      setError('');
      await updateNotificationSettings(notificationSettings);
      await loadData(); // Refresh data
      setSuccessMessage('Notification settings updated! 🔔');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to update notification settings. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyUpdate = async (privacySettings: any) => {
    try {
      setIsSaving(true);
      setError('');
      await updatePrivacySettings(privacySettings);
      await loadData();
      setSuccessMessage('Privacy settings updated! 🔒');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to update privacy settings. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAppearanceUpdate = async (appearanceSettings: any) => {
    try {
      setIsSaving(true);
      setError('');
      await updateAppearanceSettings(appearanceSettings);
      await loadData();

      // Apply theme immediately
      if (appearanceSettings.theme) {
        const theme = appearanceSettings.theme.toLowerCase();
        if (theme === 'auto') {
          // Check system preference
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.setAttribute('data-theme', 'light');
          }
        } else {
          document.documentElement.setAttribute('data-theme', theme);
        }
      }

      setSuccessMessage('Appearance settings updated! 🎨');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to update appearance settings. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setError('');
      setSuccessMessage('');
      await testNotification();
      setSuccessMessage('Test notification sent! Check your device 📱');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      
      if (errorMessage?.toLowerCase().includes('fcm token')) {
        setError('Push notifications are not set up. Please enable push notifications first, or register your device.');
      } else if (errorMessage?.toLowerCase().includes('not enabled')) {
        setError('Push notifications are not enabled. Please enable them in your settings first.');
      } else {
        setError(handleApiError(err) || 'Failed to send test notification. Please check your device settings and try again.');
      }
      setTimeout(() => setError(''), 7000);
    }
  };

  const handleExportData = async (format: string) => {
    try {
      setError('');
      setSuccessMessage('');
      setIsSaving(true);
      
      const data = await exportUserData(format);
      const blob = new Blob([data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `church_app_data_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Data exported successfully as ${format.toUpperCase()}! 📥 Check your downloads folder.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to export data. Please try again or contact support if the problem persists.');
      setTimeout(() => setError(''), 7000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setIsSaving(true);
      
      const result = await createBackup();
      setSuccessMessage(`Backup created successfully! 💾 Backup ID: ${result.backupId}. Your data is safe for 90 days.`);
      setTimeout(() => setSuccessMessage(''), 6000);
      
      // Refresh settings to update lastBackupDate
      await loadData();
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to create backup. Please try again or contact support if the problem persists.');
      setTimeout(() => setError(''), 7000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccountDeletion = async (password: string, reason: string) => {
    try {
      setError('');
      setSuccessMessage('');
      
      await requestAccountDeletion(reason.trim() || 'No reason provided', password);
      
      // Close modal on success
      setShowDeleteModal(false);
      
      setSuccessMessage('Account deletion request submitted! ✅ Please check your email for a confirmation link. Your account will be deleted after a 7-day grace period.');
      
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 5000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      
      if (errorMessage?.toLowerCase().includes('password')) {
        throw new Error('Invalid password. Please check your password and try again.');
      } else if (errorMessage?.toLowerCase().includes('already exists')) {
        throw new Error('You already have a pending deletion request. Please check your email for the confirmation link.');
      } else {
        throw new Error(handleApiError(err) || 'Failed to submit deletion request. Please try again or contact support.');
      }
    }
  };

  const handleResetSettings = async () => {
    try {
      setError('');
      setSuccessMessage('');
      setIsSaving(true);
      
      const defaultSettings = await resetToDefaults();
      setSettings(defaultSettings);
      setSuccessMessage('Settings reset to defaults! 🔄 All your preferences have been restored to their default values.');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to reset settings. Please try again or contact support if the problem persists.');
      setTimeout(() => setError(''), 7000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFeedbackSubmit = async (feedback: any) => {
    try {
      setError('');
      setSuccessMessage('');
      setIsSaving(true);
      
      const result = await submitFeedback(feedback);
      setSuccessMessage(`Feedback submitted successfully! 🎫 Ticket ID: ${result.ticketId}. We'll review your feedback and get back to you soon.`);
      setTimeout(() => setSuccessMessage(''), 6000);
      
      // Reset feedback form
      const form = document.querySelector('.feedback-form form') as HTMLFormElement;
      if (form) {
        form.reset();
      }
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      setError(errorMessage || 'Failed to submit feedback. Please try again or contact support directly.');
      setTimeout(() => setError(''), 7000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleHelpSearch = async () => {
    try {
      const helpData = await getHelpContent(selectedHelpCategory, searchQuery);
      setHelpContent(helpData);
    } catch (err: any) {
      setError('Failed to search help content');
    }
  };

  if (isLoading) {
    return (
      <div className="settings-page loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="settings-page error">
        <div className="error-content">
          <h1>⚠️ Settings Unavailable</h1>
          <p>Unable to load your settings. Please try again later.</p>
          <button onClick={loadData} className="retry-btn">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <div className="header-title">
            <h1>⚙️ Settings</h1>
            <p>Customize your Church App experience</p>
          </div>

          <div className="header-actions">
            <button
              onClick={() => navigate('/dashboard')}
              className="back-btn"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => navigate('/settings/notifications')}
          >
            🔔 Notifications
          </button>
          <button
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => navigate('/settings/privacy')}
          >
            🔒 Privacy
          </button>
          <button
            className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => navigate('/settings/appearance')}
          >
            🎨 Appearance
          </button>
          <button
            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => navigate('/settings/account')}
          >
            👤 Account
          </button>
          <button
            className={`tab-btn ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => navigate('/settings/help')}
          >
            ❓ Help
          </button>
          <button
            className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => navigate('/settings/about')}
          >
            ℹ️ About
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-banner" role="alert">
          <div className="error-banner-content">
            <span className="error-icon">✅</span>
            <span className="error-text">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="dismiss-btn" aria-label="Dismiss success message">✕</button>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
          <button onClick={() => setError('')} className="dismiss-btn" aria-label="Dismiss error message">✕</button>
        </div>
      )}

      {/* Tab Content */}
      <div className="settings-content">

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="notifications-section">
            <div className="section-header">
              <h2>🔔 Notification Preferences</h2>
              <p>Choose how and when you want to be notified</p>
            </div>

            <div className="settings-groups">
              {/* Push Notifications */}
              <div className="settings-group">
                <h3>📱 Push Notifications</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Enable Push Notifications</label>
                    <span className="setting-description">
                      Receive notifications on your device
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={(e) => handleNotificationUpdate({
                        pushNotifications: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                {settings.pushNotifications && (
                  <div className="test-notification">
                    <button
                      onClick={handleTestNotification}
                      className="test-btn"
                    >
                      📱 Send Test Notification
                    </button>
                  </div>
                )}
              </div>

              {/* Email Notifications */}
              <div className="settings-group">
                <h3>📧 Email Notifications</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Email Notifications</label>
                    <span className="setting-description">
                      Receive email updates and summaries
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => handleNotificationUpdate({
                        emailNotifications: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Weekly Digest</label>
                    <span className="setting-description">
                      Weekly summary of community activity
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.weeklyDigest}
                      onChange={(e) => handleNotificationUpdate({
                        weeklyDigest: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>

              {/* Content Notifications */}
              <div className="settings-group">
                <h3>📝 Content Notifications</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Prayer Request Updates</label>
                    <span className="setting-description">
                      New prayer requests and answered prayers
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.prayerNotifications}
                      onChange={(e) => handleNotificationUpdate({
                        prayerNotifications: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Announcements</label>
                    <span className="setting-description">
                      Church announcements and important updates
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.announcementNotifications}
                      onChange={(e) => handleNotificationUpdate({
                        announcementNotifications: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Event Reminders</label>
                    <span className="setting-description">
                      Upcoming events and RSVP reminders
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.eventNotifications}
                      onChange={(e) => handleNotificationUpdate({
                        eventNotifications: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Chat Messages</label>
                    <span className="setting-description">
                      New messages in group chats
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.chatNotifications}
                      onChange={(e) => handleNotificationUpdate({
                        chatNotifications: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>

              {/* Event Reminder Timing */}
              <div className="settings-group">
                <h3>⏰ Reminder Timing</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Event Reminder Time</label>
                    <span className="setting-description">
                      How many hours before events to send reminders
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.eventRemindersHours}
                      onChange={(e) => handleNotificationUpdate({
                        eventRemindersHours: parseInt(e.target.value)
                      })}
                      className="setting-select"
                    >
                      <option value={1}>1 hour before</option>
                      <option value={2}>2 hours before</option>
                      <option value={6}>6 hours before</option>
                      <option value={24}>1 day before</option>
                      <option value={48}>2 days before</option>
                      <option value={168}>1 week before</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="privacy-section">
            <div className="section-header">
              <h2>🔒 Privacy Settings</h2>
              <p>Control who can see your information and activity</p>
            </div>

            <div className="settings-groups">
              {/* Profile Visibility */}
              <div className="settings-group">
                <h3>👤 Profile Visibility</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Who can see your profile?</label>
                    <span className="setting-description">
                      Control who can view your profile information
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => handlePrivacyUpdate({
                        profileVisibility: e.target.value
                      })}
                      className="setting-select"
                    >
                      <option value="PUBLIC">Everyone (Public)</option>
                      <option value="CHURCH_MEMBERS">Church Members Only</option>
                      <option value="FRIENDS_ONLY">Friends Only</option>
                      <option value="PRIVATE">Private (Only You)</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Show Online Status</label>
                    <span className="setting-description">
                      Let others see when you're online
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.showOnlineStatus}
                      onChange={(e) => handlePrivacyUpdate({
                        showOnlineStatus: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>

              {/* Communication Privacy */}
              <div className="settings-group">
                <h3>💬 Communication</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Allow Direct Messages</label>
                    <span className="setting-description">
                      Let other members send you private messages
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.allowDirectMessages}
                      onChange={(e) => handlePrivacyUpdate({
                        allowDirectMessages: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Prayer Request Visibility</label>
                    <span className="setting-description">
                      Who can see your prayer requests
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.prayerRequestVisibility}
                      onChange={(e) => handlePrivacyUpdate({
                        prayerRequestVisibility: e.target.value
                      })}
                      className="setting-select"
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="CHURCH_MEMBERS">Church Members</option>
                      <option value="PRIVATE">Private</option>
                      <option value="ANONYMOUS">Anonymous</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial Privacy */}
              <div className="settings-group">
                <h3>💰 Financial Privacy</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Show Donation History</label>
                    <span className="setting-description">
                      Include donation history in data exports
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.showDonationHistory}
                      onChange={(e) => handlePrivacyUpdate({
                        showDonationHistory: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Donation Reminders</label>
                    <span className="setting-description">
                      Receive gentle reminders about giving
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.donationReminders}
                      onChange={(e) => handlePrivacyUpdate({
                        donationReminders: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>

              {/* Data & Analytics */}
              <div className="settings-group">
                <h3>📊 Data Usage</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Share Anonymous Analytics</label>
                    <span className="setting-description">
                      Help improve the app with anonymous usage data
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.dataSharingAnalytics}
                      onChange={(e) => handlePrivacyUpdate({
                        dataSharingAnalytics: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Auto Backup</label>
                    <span className="setting-description">
                      Automatically backup your data weekly
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.autoBackupEnabled}
                      onChange={(e) => handlePrivacyUpdate({
                        autoBackupEnabled: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="appearance-section">
            <div className="section-header">
              <h2>🎨 Appearance Settings</h2>
              <p>Customize how the app looks and feels</p>
            </div>

            <div className="settings-groups">
              {/* Theme Settings */}
              <div className="settings-group">
                <h3>🌙 Theme</h3>
                <div className="theme-selector">
                  <div className="theme-options">
                    <div
                      className={`theme-option ${settings.theme === 'LIGHT' ? 'selected' : ''}`}
                      onClick={() => handleAppearanceUpdate({ theme: 'LIGHT' })}
                    >
                      <div className="theme-preview light">
                        <div className="theme-header"></div>
                        <div className="theme-content">
                          <div className="theme-sidebar"></div>
                          <div className="theme-main"></div>
                        </div>
                      </div>
                      <span>☀️ Light</span>
                    </div>

                    <div
                      className={`theme-option ${settings.theme === 'DARK' ? 'selected' : ''}`}
                      onClick={() => handleAppearanceUpdate({ theme: 'DARK' })}
                    >
                      <div className="theme-preview dark">
                        <div className="theme-header"></div>
                        <div className="theme-content">
                          <div className="theme-sidebar"></div>
                          <div className="theme-main"></div>
                        </div>
                      </div>
                      <span>🌙 Dark</span>
                    </div>

                    <div
                      className={`theme-option ${settings.theme === 'AUTO' ? 'selected' : ''}`}
                      onClick={() => handleAppearanceUpdate({ theme: 'AUTO' })}
                    >
                      <div className="theme-preview auto">
                        <div className="theme-header"></div>
                        <div className="theme-content">
                          <div className="theme-sidebar"></div>
                          <div className="theme-main"></div>
                        </div>
                      </div>
                      <span>🔄 Auto</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Font Settings */}
              <div className="settings-group">
                <h3>🔤 Font & Text</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Font Size</label>
                    <span className="setting-description">
                      Choose your preferred text size
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.fontSize}
                      onChange={(e) => handleAppearanceUpdate({
                        fontSize: e.target.value
                      })}
                      className="setting-select"
                    >
                      <option value="SMALL">Small</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LARGE">Large</option>
                      <option value="EXTRA_LARGE">Extra Large</option>
                    </select>
                  </div>
                </div>

                <div className="font-preview">
                  <div className={`preview-text font-${settings.fontSize.toLowerCase()}`}>
                    This is how your text will look with the selected font size.
                    📖 "Faith is taking the first step even when you don't see the whole staircase."
                  </div>
                </div>
              </div>

              {/* Accessibility */}
              <div className="settings-group">
                <h3>♿ Accessibility</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>High Contrast Mode</label>
                    <span className="setting-description">
                      Increase contrast for better visibility
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.highContrastMode}
                      onChange={(e) => handleAppearanceUpdate({
                        highContrastMode: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Reduce Motion</label>
                    <span className="setting-description">
                      Minimize animations and transitions
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.reduceMotion}
                      onChange={(e) => handleAppearanceUpdate({
                        reduceMotion: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Screen Reader Optimization</label>
                    <span className="setting-description">
                      Optimize interface for screen readers
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.screenReaderOptimized}
                      onChange={(e) => handleAppearanceUpdate({
                        screenReaderOptimized: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>

              {/* Language & Region */}
              <div className="settings-group">
                <h3>🌍 Language & Region</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Language</label>
                    <span className="setting-description">
                      Choose your preferred language
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.language}
                      onChange={(e) => handleAppearanceUpdate({
                        language: e.target.value
                      })}
                      className="setting-select"
                    >
                      <option value="en">🇺🇸 English</option>
                      <option value="es">🇪🇸 Español</option>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="de">🇩🇪 Deutsch</option>
                      <option value="pt">🇧🇷 Português</option>
                      <option value="zh">🇨🇳 中文</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Timezone</label>
                    <span className="setting-description">
                      Set your local timezone for events
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleAppearanceUpdate({
                        timezone: e.target.value
                      })}
                      className="setting-select"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Chicago">Central Time (US)</option>
                      <option value="America/Denver">Mountain Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Australia/Sydney">Sydney (AEDT)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="account-section">
            <div className="section-header">
              <h2>👤 Account Management</h2>
              <p>Manage your account data and preferences</p>
            </div>

            <div className="settings-groups">
              {/* Account Info */}
              <div className="settings-group">
                <h3>👤 Account Information</h3>
                <div className="account-info">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{user?.name}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{user?.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Role:</span>
                    <span className="info-value">{user?.role}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Member Since:</span>
                    <span className="info-value">
                      {settings.createdAt ? new Date(settings.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="account-actions">
                  <button
                    onClick={() => navigate('/profile/edit')}
                    className="edit-profile-btn"
                  >
                    ✏️ Edit Profile
                  </button>
                </div>
              </div>

              {/* Data Management */}
              <div className="settings-group">
                <h3>💾 Data Management</h3>
                <div className="data-actions">
                  <div className="action-item">
                    <div className="action-info">
                      <h4>📥 Export My Data</h4>
                      <p>Download a copy of all your data</p>
                    </div>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleExportData('json')}
                        className="export-btn json"
                      >
                        📄 JSON
                      </button>
                      <button
                        onClick={() => handleExportData('pdf')}
                        className="export-btn pdf"
                      >
                        📑 PDF
                      </button>
                    </div>
                  </div>

                  <div className="action-item">
                    <div className="action-info">
                      <h4>💾 Create Backup</h4>
                      <p>Create a backup of your account data</p>
                      {settings.lastBackupDate && (
                        <small>
                          Last backup: {new Date(settings.lastBackupDate).toLocaleString()}
                        </small>
                      )}
                    </div>
                    <div className="action-buttons">
                      <button
                        onClick={handleCreateBackup}
                        className="backup-btn"
                      >
                        🔄 Create Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Communication Preferences */}
              <div className="settings-group">
                <h3>📞 Communication</h3>
                <div className="setting-item">
                  <div className="setting-info">
                    <label>Preferred Contact Method</label>
                    <span className="setting-description">
                      How would you like the church to contact you?
                    </span>
                  </div>
                  <div className="setting-control">
                    <select
                      value={settings.preferredContactMethod}
                      onChange={(e) => handleSaveSettings({
                        preferredContactMethod: e.target.value
                      })}
                      className="setting-select"
                    >
                      <option value="EMAIL">📧 Email</option>
                      <option value="PHONE">📞 Phone</option>
                      <option value="APP_ONLY">📱 App Only</option>
                      <option value="NONE">🚫 No Contact</option>
                    </select>
                  </div>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <label>Newsletter Subscription</label>
                    <span className="setting-description">
                      Receive church newsletters and updates
                    </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="checkbox"
                      checked={settings.newsletterSubscription}
                      onChange={(e) => handleSaveSettings({
                        newsletterSubscription: e.target.checked
                      })}
                      className="toggle-switch"
                    />
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="settings-group danger-zone">
                <h3>⚠️ Danger Zone</h3>
                <div className="danger-actions">
                  <div className="danger-item">
                    <div className="danger-info">
                      <h4>🔄 Reset All Settings</h4>
                      <p>Reset all settings to their default values</p>
                    </div>
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="danger-btn reset"
                      disabled={isSaving}
                    >
                      Reset Settings
                    </button>
                  </div>

                  <div className="danger-item">
                    <div className="danger-info">
                      <h4>🗑️ Delete Account</h4>
                      <p>Permanently delete your account and all data</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="danger-btn delete"
                      disabled={isSaving}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Tab */}
        {activeTab === 'help' && (
          <div className="help-section">
            <div className="section-header">
              <h2>❓ Help & Support</h2>
              <p>Find answers to common questions and get support</p>
            </div>

            {/* Help Search */}
            <div className="help-search">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button
                  onClick={handleHelpSearch}
                  className="search-btn"
                >
                  🔍 Search
                </button>
              </div>

              <div className="help-categories">
                <button
                  className={`category-btn ${selectedHelpCategory === '' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedHelpCategory('');
                    handleHelpSearch();
                  }}
                >
                  All Categories
                </button>
                {helpContent?.categories?.map((category: any) => (
                  <button
                    key={category.id}
                    className={`category-btn ${selectedHelpCategory === category.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedHelpCategory(category.id);
                      handleHelpSearch();
                    }}
                  >
                    {category.icon} {category.title}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ Items */}
            <div className="faq-section">
              <h3>📋 Frequently Asked Questions</h3>
              <div className="faq-items">
                {helpContent?.faqItems?.map((item: any) => (
                  <details key={item.id} className="faq-item">
                    <summary className="faq-question">
                      {item.question}
                    </summary>
                    <div className="faq-answer">
                      <p>{item.answer}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            {/* Contact Support */}
            <div className="support-section">
              <h3>📞 Contact Support</h3>
              <div className="support-options">
                <div className="support-option">
                  <div className="support-icon">📧</div>
                  <div className="support-info">
                    <h4>Email Support</h4>
                    <p>{helpContent?.supportEmail || 'support@yourchurch.org'}</p>
                  </div>
                </div>

                <div className="support-option">
                  <div className="support-icon">📞</div>
                  <div className="support-info">
                    <h4>Phone Support</h4>
                    <p>{helpContent?.supportPhone || '+1 (555) 123-4567'}</p>
                  </div>
                </div>
              </div>

              {/* Feedback Form */}
              <div className="feedback-form">
                <h4>💌 Send Feedback</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const feedback = {
                      type: formData.get('type') as string,
                      subject: formData.get('subject') as string,
                      message: formData.get('message') as string,
                      email: user?.email || ''
                    };
                    handleFeedbackSubmit(feedback);
                    (e.target as HTMLFormElement).reset();
                  }}
                >
                  <div className="form-group">
                    <select name="type" required className="form-select">
                      <option value="">Select feedback type...</option>
                      <option value="bug">🐛 Bug Report</option>
                      <option value="feature">💡 Feature Request</option>
                      <option value="improvement">📈 Improvement</option>
                      <option value="question">❓ Question</option>
                      <option value="other">📝 Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <input
                      name="subject"
                      type="text"
                      placeholder="Subject"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <textarea
                      name="message"
                      placeholder="Tell us more..."
                      rows={4}
                      required
                      className="form-textarea"
                    ></textarea>
                  </div>

                  <button type="submit" className="submit-btn">
                    📤 Send Feedback
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="about-section">
            <div className="section-header">
              <h2>ℹ️ About Church App</h2>
              <p>Version information and app details</p>
            </div>

            <div className="about-content">
              {/* App Info */}
              <div className="app-info">
                <div className="app-logo">
                  <div className="logo-placeholder">⛪</div>
                </div>
                <div className="app-details">
                  <h3>Church App</h3>
                  <p>Connecting your church community digitally</p>
                  <div className="version-info">
                    <div className="version-item">
                      <span className="version-label">Version:</span>
                      <span className="version-value">{systemInfo?.appVersion || '1.0.0'}</span>
                    </div>
                    {systemInfo?.buildDate && (
                      <div className="version-item">
                        <span className="version-label">Build Date:</span>
                        <span className="version-value">{systemInfo.buildDate}</span>
                      </div>
                    )}
                    <div className="version-item">
                      <span className="version-label">Platform:</span>
                      <span className="version-value">
                        {systemInfo?.platform || 'Web/Mobile'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="features-section">
                <h3>🚀 Features</h3>
                <div className="features-grid">
                  <div className="feature-item">
                    <div className="feature-icon">🙏</div>
                    <div className="feature-text">Prayer Requests</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">💬</div>
                    <div className="feature-text">Group Chats</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">📢</div>
                    <div className="feature-text">Announcements</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">📅</div>
                    <div className="feature-text">Events & Calendar</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">💰</div>
                    <div className="feature-text">Secure Giving</div>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon">📚</div>
                    <div className="feature-text">Resource Library</div>
                  </div>
                </div>
              </div>

              {/* Credits */}
              <div className="credits-section">
                <h3>❤️ Credits</h3>
                <p>
                  Built with love for church communities worldwide.
                  Special thanks to all the contributors and beta testers
                  who helped make this app possible.
                </p>
                <div className="tech-stack">
                  <span className="tech-badge">React</span>
                  <span className="tech-badge">TypeScript</span>
                  <span className="tech-badge">Spring Boot</span>
                  <span className="tech-badge">PostgreSQL</span>
                  <span className="tech-badge">Capacitor</span>
                </div>
              </div>

              {/* Legal */}
              <div className="legal-section">
                <h3>📄 Legal</h3>
                <div className="legal-links">
                  <a href="/privacy-policy" className="legal-link">Privacy Policy</a>
                  <a href="/terms-of-service" className="legal-link">Terms of Service</a>
                  <a href="/data-policy" className="legal-link">Data Policy</a>
                  <a href="/licenses" className="legal-link">Open Source Licenses</a>
                </div>
                <p className="copyright">
                  © 2024 Church App. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isSaving && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <span>Saving settings...</span>
          </div>
        </div>
      )}

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSubmit={handleAccountDeletion}
        userName={user?.name}
      />

      {/* Reset Settings Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={async () => {
          await handleResetSettings();
          setShowResetModal(false);
        }}
        title="🔄 Reset All Settings"
        message="Are you sure you want to reset all your settings to their default values? This action cannot be undone and will restore all preferences to factory defaults."
        confirmText="Reset Settings"
        cancelText="Cancel"
        confirmButtonVariant="warning"
        isLoading={isSaving}
      />
    </div>
  );
};

export default SettingsPage;