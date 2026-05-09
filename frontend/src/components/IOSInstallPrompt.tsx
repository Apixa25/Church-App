import React, { useState, useEffect } from 'react';
import './IOSInstallPrompt.css';

/**
 * Detects iOS Safari users who haven't installed the PWA yet and shows
 * a friendly guide explaining how to "Add to Home Screen" so they can
 * receive push notifications.
 *
 * Push notifications on iOS only work when the site is installed as a PWA
 * and opened from the Home Screen icon (iOS 16.4+).
 */
const IOSInstallPrompt: React.FC = () => {
  const [shouldShow, setShouldShow] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('ios-install-prompt-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Check if already running as installed PWA
    const isStandalone =
      ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;

    // Show the prompt only for iOS users who haven't installed the PWA
    if (isIOS && !isStandalone) {
      setShouldShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setIsDismissed(true);
    // Don't persist — show again next session
  };

  if (!shouldShow || isDismissed) {
    return null;
  }

  return (
    <div className="ios-install-prompt">
      <button className="ios-install-close" onClick={handleDismiss} aria-label="Close">
        ✕
      </button>

      <div className="ios-install-header">
        <span className="ios-install-icon">📲</span>
        <h3>Install The Gathering</h3>
      </div>

      <p className="ios-install-description">
        Install this app on your iPhone to receive push notifications for messages,
        prayer requests, and community updates.
      </p>

      <div className="ios-install-steps">
        <div className="ios-step">
          <span className="ios-step-number">1</span>
          <span className="ios-step-text">
            Tap the <strong>Share</strong> button
            <span className="ios-share-icon" aria-label="share icon">
              {/* Safari share icon (box with arrow) */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </span>
            at the bottom of Safari
          </span>
        </div>
        <div className="ios-step">
          <span className="ios-step-number">2</span>
          <span className="ios-step-text">
            Scroll down and tap <strong>"Add to Home Screen"</strong>
          </span>
        </div>
        <div className="ios-step">
          <span className="ios-step-number">3</span>
          <span className="ios-step-text">
            Open <strong>The Gathering</strong> from your Home Screen
          </span>
        </div>
      </div>

      <div className="ios-install-actions">
        <button className="ios-action-remind" onClick={handleRemindLater}>
          Remind Me Later
        </button>
        <button className="ios-action-dismiss" onClick={handleDismiss}>
          Don't Show Again
        </button>
      </div>
    </div>
  );
};

export default IOSInstallPrompt;
