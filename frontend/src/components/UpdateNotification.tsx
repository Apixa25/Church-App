import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import './UpdateNotification.css';

interface UpdateNotificationProps {
  onUpdate: () => void;
  onDismiss?: () => void;
  autoRefreshDelay?: number; // in seconds, 0 to disable
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  onUpdate,
  onDismiss,
  autoRefreshDelay = 10 // Default 10 seconds
}) => {
  const [timeRemaining, setTimeRemaining] = useState(autoRefreshDelay);
  const [isDismissed, setIsDismissed] = useState(false);

  // Countdown timer for auto-refresh
  useEffect(() => {
    if (autoRefreshDelay > 0 && !isDismissed) {
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onUpdate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefreshDelay, isDismissed, onUpdate]);

  const handleUpdate = () => {
    onUpdate();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="update-notification">
      <div className="update-notification-content">
        <div className="update-notification-icon">
          <RefreshCw size={20} />
        </div>
        <div className="update-notification-text">
          <div className="update-notification-title">New version available</div>
          <div className="update-notification-message">
            {autoRefreshDelay > 0 && timeRemaining > 0 ? (
              <>Refreshing automatically in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}...</>
            ) : (
              <>A new version of the app is available. Refresh to get the latest features and improvements.</>
            )}
          </div>
        </div>
        <div className="update-notification-actions">
          <button
            className="update-notification-btn refresh-btn"
            onClick={handleUpdate}
            aria-label="Refresh to update"
          >
            <RefreshCw size={16} />
            Refresh Now
          </button>
          {onDismiss && (
            <button
              className="update-notification-btn dismiss-btn"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

