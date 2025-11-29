import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMyWarnings } from '../services/postApi';
import './WarningBanner.css';

interface WarningBannerProps {
  onViewWarnings?: () => void;
}

const WarningBanner: React.FC<WarningBannerProps> = ({ onViewWarnings }) => {
  const { user } = useAuth();
  const [warningCount, setWarningCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const loadWarnings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await getMyWarnings();
        const count = response.totalWarningCount || response.warningCount || 0;
        setWarningCount(count);
        
        // Check if user has dismissed the banner before (stored in localStorage)
        const dismissedKey = `warning_banner_dismissed_${user.id}`;
        const dismissed = localStorage.getItem(dismissedKey);
        setIsDismissed(dismissed === 'true');
      } catch (error) {
        console.error('Error loading warnings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWarnings();
  }, [user]);

  const handleDismiss = () => {
    if (user) {
      const dismissedKey = `warning_banner_dismissed_${user.id}`;
      localStorage.setItem(dismissedKey, 'true');
      setIsDismissed(true);
    }
  };

  if (isLoading || warningCount === 0 || isDismissed) {
    return null;
  }

  return (
    <div className="warning-banner">
      <div className="warning-banner-content">
        <div className="warning-banner-icon">⚠️</div>
        <div className="warning-banner-text">
          <strong>You have {warningCount} warning{warningCount !== 1 ? 's' : ''}</strong>
          <span>Please review our community guidelines. Repeated violations may result in account restrictions.</span>
        </div>
        <div className="warning-banner-actions">
          {onViewWarnings && (
            <button 
              className="warning-banner-button view"
              onClick={onViewWarnings}
            >
              View Details
            </button>
          )}
          <button 
            className="warning-banner-button dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss warning banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarningBanner;

