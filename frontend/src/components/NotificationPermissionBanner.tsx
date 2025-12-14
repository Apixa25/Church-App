import React, { useState, useEffect } from 'react';
import useNotifications from '../hooks/useNotifications';
import './NotificationPermissionBanner.css';

/**
 * Banner component for requesting notification permission
 * Shows when user hasn't enabled notifications yet
 */
const NotificationPermissionBanner: React.FC = () => {
  const {
    permission,
    isRegistered,
    isLoading,
    error,
    requestPermission,
    sendTestNotification,
    isSupported
  } = useNotifications();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showTestButton, setShowTestButton] = useState(false);

  // Don't show banner if:
  // - Not supported
  // - Already dismissed
  // - Permission already granted and registered
  // - Permission explicitly denied
  const shouldShowBanner =
    isSupported &&
    !isDismissed &&
    !(permission === 'granted' && isRegistered) &&
    permission !== 'denied';

  // Load dismissed state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('notification-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const success = await requestPermission();
    if (success) {
      setShowTestButton(true);
      // Auto-hide banner after successful registration
      setTimeout(() => {
        setIsDismissed(true);
      }, 5000);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('notification-banner-dismissed', 'true');
  };

  const handleTestNotification = async () => {
    await sendTestNotification();
  };

  if (!shouldShowBanner) {
    return null;
  }

  return (
    <div className="notification-permission-banner">
      <div className="banner-content">
        <div className="banner-icon">🔔</div>
        <div className="banner-text">
          <h3>Stay Connected with TheGathering</h3>
          <p>
            Get instant notifications for prayer requests, events, and community updates.
            Never miss what matters to your faith community!
          </p>
        </div>
        <div className="banner-actions">
          {!isRegistered ? (
            <>
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="enable-btn"
              >
                {isLoading ? '...' : '✨ Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="dismiss-btn"
              >
                Maybe Later
              </button>
            </>
          ) : (
            <>
              <div className="success-message">
                ✅ Notifications enabled!
              </div>
              {showTestButton && (
                <button
                  onClick={handleTestNotification}
                  className="test-btn"
                >
                  Send Test
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="banner-error">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionBanner;
