import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  createPushSubscription,
  sendTestNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
  NotificationSubscription
} from '../services/notificationService';
import './PushNotifications.css';

interface PushNotificationsProps {
  isAdmin?: boolean;
}

const PushNotifications: React.FC<PushNotificationsProps> = ({ isAdmin = false }) => {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushEnabled: true,
    emailEnabled: true,
    prayerRequests: true,
    announcements: true,
    comments: true,
    likes: false,
    follows: true,
    events: true,
    eventReminders: true,
    mentions: true,
    directMessages: true,
    systemUpdates: true,
    weeklyDigest: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkNotificationStatus();
    loadPreferences();
  }, []);

  const checkNotificationStatus = async () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    // Check if already subscribed
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        setSubscription(existingSubscription);
        setIsSubscribed(!!existingSubscription);
      } catch (err) {
        console.error('Error checking subscription status:', err);
      }
    }
  };

  const loadPreferences = async () => {
    try {
      if (user) {
        const userPreferences = await getNotificationPreferences(user.id);
        setPreferences(userPreferences);
      }
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      // Use default preferences if loading fails
    }
  };

  const handleRequestPermission = async () => {
    try {
      setIsLoading(true);
      setError('');

      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        await handleSubscribe();
      } else {
        setError('Notification permission denied. Please enable notifications in your browser settings.');
      }
    } catch (err: any) {
      console.error('Error requesting permission:', err);
      setError('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError('');

      // First create a push subscription
      const pushSubscription = await createPushSubscription('your-vapid-key'); // You'll need to get this from your backend
      if (!pushSubscription) {
        throw new Error('Failed to create push subscription');
      }

      const newSubscription = await subscribeToPushNotifications(user.userId, pushSubscription);
      setSubscription(pushSubscription);
      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Error subscribing to notifications:', err);
      setError('Failed to subscribe to notifications');
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError('');

      // For now, we'll just unsubscribe locally since we need a subscription ID
      // In a real implementation, you'd store the subscription ID and pass it here
      await unsubscribeFromPushNotifications(user.userId, 'subscription-id');
      setSubscription(null);
      setIsSubscribed(false);
    } catch (err: any) {
      console.error('Error unsubscribing from notifications:', err);
      setError('Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      if (user) {
        await updateNotificationPreferences(user.id, newPreferences);
      }
    } catch (err: any) {
      console.error('Error updating preferences:', err);
      setError('Failed to save notification preferences');
    }
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    const newQuietHours = { ...preferences.quietHours, [field]: value };
    handlePreferenceChange('quietHours', newQuietHours);
  };

  const handleSendTestNotification = async () => {
    try {
      setIsLoading(true);
      setError('');
      setTestNotificationSent(false);

      await sendTestNotification();

      setTestNotificationSent(true);
      setTimeout(() => setTestNotificationSent(false), 3000);
    } catch (err: any) {
      console.error('Error sending test notification:', err);
      setError('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatusText = () => {
    switch (notificationPermission) {
      case 'granted':
        return '✅ Notifications enabled';
      case 'denied':
        return '❌ Notifications blocked';
      default:
        return '⏳ Click to enable notifications';
    }
  };

  const getPermissionStatusColor = () => {
    switch (notificationPermission) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      default:
        return 'default';
    }
  };

  return (
    <div className="push-notifications">
      {/* Header */}
      <div className="notifications-header">
        <div className="header-content">
          <h1>🔔 Push Notifications</h1>
          <p>Stay connected with your church community</p>
        </div>

        <div className={`permission-status ${getPermissionStatusColor()}`}>
          {getPermissionStatusText()}
        </div>
      </div>

      {/* Browser Support Check */}
      {(!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) && (
        <div className="browser-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h3>Browser Not Supported</h3>
            <p>Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button onClick={() => setError('')} className="dismiss-error">
            ✕
          </button>
        </div>
      )}

      {/* Permission Request Section */}
      <div className="permission-section">
        <div className="permission-card">
          <div className="permission-content">
            <div className="permission-icon">
              {notificationPermission === 'granted' ? '🔔' : '🔕'}
            </div>
            <div className="permission-text">
              <h3>Notification Permission</h3>
              <p>
                {notificationPermission === 'granted'
                  ? 'Great! You\'ll receive notifications for important updates from your church community.'
                  : 'Enable notifications to stay updated with prayer requests, events, and community announcements.'}
              </p>
            </div>
          </div>

          <div className="permission-actions">
            {notificationPermission === 'default' && (
              <button
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="permission-btn enable"
              >
                {isLoading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Enabling...
                  </>
                ) : (
                  <>Enable Notifications</>
                )}
              </button>
            )}

            {notificationPermission === 'granted' && !isSubscribed && (
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="permission-btn subscribe"
              >
                {isLoading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Subscribing...
                  </>
                ) : (
                  <>Subscribe to Church Updates</>
                )}
              </button>
            )}

            {notificationPermission === 'granted' && isSubscribed && (
              <button
                onClick={handleUnsubscribe}
                disabled={isLoading}
                className="permission-btn unsubscribe"
              >
                {isLoading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Unsubscribing...
                  </>
                ) : (
                  <>Unsubscribe from Notifications</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      {notificationPermission === 'granted' && (
        <div className="preferences-section">
          <h2>Notification Preferences</h2>
          <p>Choose what notifications you'd like to receive</p>

          <div className="preferences-grid">
            {/* Prayer Requests */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">🙏</div>
                <div className="preference-text">
                  <h4>Prayer Requests</h4>
                  <p>Get notified when community members share prayer requests</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.prayerRequests}
                  onChange={(e) => handlePreferenceChange('prayerRequests', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Event Reminders */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">📅</div>
                <div className="preference-text">
                  <h4>Event Reminders</h4>
                  <p>Receive reminders for upcoming church events</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.eventReminders}
                  onChange={(e) => handlePreferenceChange('eventReminders', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Announcements */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">📢</div>
                <div className="preference-text">
                  <h4>Announcements</h4>
                  <p>Important announcements from church leadership</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.announcements}
                  onChange={(e) => handlePreferenceChange('announcements', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Comments */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">💬</div>
                <div className="preference-text">
                  <h4>Comments & Replies</h4>
                  <p>When someone comments on your posts or replies to your comments</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.comments}
                  onChange={(e) => handlePreferenceChange('comments', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Likes */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">❤️</div>
                <div className="preference-text">
                  <h4>Likes & Appreciation</h4>
                  <p>When community members like your posts</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.likes}
                  onChange={(e) => handlePreferenceChange('likes', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Mentions */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">👤</div>
                <div className="preference-text">
                  <h4>Mentions</h4>
                  <p>When someone mentions you in a post or comment</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.mentions}
                  onChange={(e) => handlePreferenceChange('mentions', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Direct Messages */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">💌</div>
                <div className="preference-text">
                  <h4>Direct Messages</h4>
                  <p>Private messages from other community members</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.directMessages}
                  onChange={(e) => handlePreferenceChange('directMessages', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* System Updates */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">⚙️</div>
                <div className="preference-text">
                  <h4>System Updates</h4>
                  <p>Important updates about the church app</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.systemUpdates}
                  onChange={(e) => handlePreferenceChange('systemUpdates', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Weekly Digest */}
            <div className="preference-item">
              <div className="preference-content">
                <div className="preference-icon">📧</div>
                <div className="preference-text">
                  <h4>Weekly Digest</h4>
                  <p>A summary of community activity from the past week</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigest}
                  onChange={(e) => handlePreferenceChange('weeklyDigest', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="quiet-hours-section">
            <h3>Quiet Hours</h3>
            <p>Don't receive notifications during certain hours</p>

            <div className="quiet-hours-controls">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.quietHours?.enabled || false}
                  onChange={(e) => handlePreferenceChange('quietHours', {
                    ...preferences.quietHours,
                    enabled: !(preferences.quietHours?.enabled || false)
                  })}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Enable quiet hours</span>
              </label>

              {preferences.quietHours?.enabled && (
                <div className="time-controls">
                  <div className="time-input">
                    <label>Start time</label>
                    <input
                      type="time"
                      value={preferences.quietHours?.start || '22:00'}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="time-picker"
                    />
                  </div>
                  <div className="time-input">
                    <label>End time</label>
                    <input
                      type="time"
                      value={preferences.quietHours?.end || '08:00'}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="time-picker"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Notification */}
      {isSubscribed && (
        <div className="test-notification-section">
          <h2>Test Notifications</h2>
          <div className="test-card">
            <div className="test-content">
              <div className="test-icon">🔔</div>
              <div className="test-text">
                <h4>Send Test Notification</h4>
                <p>Receive a test notification to verify everything is working</p>
              </div>
            </div>
            <button
              onClick={handleSendTestNotification}
              disabled={isLoading}
              className="test-btn"
            >
              {isLoading ? (
                <>
                  <div className="btn-spinner"></div>
                  Sending...
                </>
              ) : testNotificationSent ? (
                <>✅ Sent!</>
              ) : (
                <>Send Test</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Subscription Info */}
      {isSubscribed && subscription && (
        <div className="subscription-info">
          <h3>Subscription Details</h3>
          <div className="subscription-details">
            <div className="detail-item">
              <span className="detail-label">Endpoint:</span>
              <span className="detail-value">{subscription.endpoint}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value status-active">✅ Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <h2>📚 Help & Troubleshooting</h2>
        <div className="help-grid">
          <div className="help-item">
            <h4>Why aren't I receiving notifications?</h4>
            <ul>
              <li>Check that notifications are enabled in your browser</li>
              <li>Ensure you're subscribed to church updates</li>
              <li>Check your quiet hours settings</li>
              <li>Verify your device isn't in Do Not Disturb mode</li>
            </ul>
          </div>

          <div className="help-item">
            <h4>How to enable notifications</h4>
            <ul>
              <li>Click the lock icon in your browser's address bar</li>
              <li>Select "Allow" for notifications</li>
              <li>Refresh the page and try again</li>
              <li>Check your browser's site settings</li>
            </ul>
          </div>

          <div className="help-item">
            <h4>Privacy & Security</h4>
            <ul>
              <li>We only send notifications you've opted into</li>
              <li>Your notification preferences are stored securely</li>
              <li>You can unsubscribe at any time</li>
              <li>We respect your quiet hours settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotifications;
