import React, { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import './IOSInstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PromptMode = 'ios' | 'ios-safari-needed' | 'android' | 'android-manual' | null;

const DISMISS_KEY = 'pwa-install-prompt-dismissed';
const LEGACY_IOS_DISMISS_KEY = 'ios-install-prompt-dismissed';

const ShareIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const AddHomeIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

function isStandaloneDisplay(): boolean {
  return (
    ('standalone' in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)) ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

function detectIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function detectAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

function needsSafariOnIos(): boolean {
  const ua = navigator.userAgent;
  return (
    /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser/i.test(ua) ||
    /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Bytedance|Snapchat|WhatsApp|GSA\//i.test(ua)
  );
}

function detectInAppBrowserName(): string | null {
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'Facebook';
  if (/TikTok|Bytedance/i.test(ua)) return 'TikTok';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp';
  if (/CriOS/i.test(ua)) return 'Chrome';
  if (/FxiOS/i.test(ua)) return 'Firefox';
  return null;
}

/**
 * Installs The Gathering as a home-screen app without app stores.
 * Android Chrome: native Install button via beforeinstallprompt.
 * iPhone: visual Share-sheet steps (Safari only).
 */
const IOSInstallPrompt: React.FC = () => {
  const [mode, setMode] = useState<PromptMode>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const dismissed =
      localStorage.getItem(DISMISS_KEY) === 'true' ||
      localStorage.getItem(LEGACY_IOS_DISMISS_KEY) === 'true';
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    if (isStandaloneDisplay()) {
      return;
    }

    const ios = detectIos();
    const android = detectAndroid();

    if (ios) {
      setMode(needsSafariOnIos() ? 'ios-safari-needed' : 'ios');
      return;
    }

    if (android) {
      setMode('android-manual');
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode('android');
    };

    const onInstalled = () => {
      setMode(null);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  const handleRemindLater = () => {
    setIsDismissed(true);
  };

  const handleInstallAndroid = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setMode(null);
        localStorage.setItem(DISMISS_KEY, 'true');
      }
      setDeferredPrompt(null);
    } catch (error) {
      console.warn('PWA install prompt failed', error);
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (!mode || isDismissed) {
    return null;
  }

  const inAppName = detectInAppBrowserName();

  return (
    <div className="ios-install-prompt" role="region" aria-label="Install The Gathering">
      <button className="ios-install-close" onClick={handleDismiss} aria-label="Close">
        ✕
      </button>

      <div className="ios-install-header">
        <span className="ios-install-icon">📲</span>
        <h3>Install The Gathering</h3>
      </div>

      {mode === 'android' && (
        <>
          <p className="ios-install-description">
            Add The Gathering to your home screen. One tap — no Play Store needed.
            You will get a full-screen app icon and can turn on notifications.
          </p>
          <button
            className="pwa-install-primary"
            onClick={handleInstallAndroid}
            disabled={installing}
          >
            {installing ? 'Opening install…' : 'Install app'}
          </button>
        </>
      )}

      {mode === 'android-manual' && (
        <>
          <p className="ios-install-description">
            Add The Gathering to your home screen from Chrome. No Play Store needed.
          </p>
          <div className="ios-install-steps">
            <div className="ios-step">
              <span className="ios-step-number">1</span>
              <span className="ios-step-text">
                Tap the <strong>⋮</strong> menu in the top-right of Chrome
              </span>
            </div>
            <div className="ios-step">
              <span className="ios-step-number">2</span>
              <span className="ios-step-text">
                Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>
              </span>
            </div>
            <div className="ios-step">
              <span className="ios-step-number">3</span>
              <span className="ios-step-text">
                Open the new <strong>Gathering</strong> icon on your home screen
              </span>
            </div>
          </div>
        </>
      )}

      {mode === 'ios-safari-needed' && (
        <>
          <p className="ios-install-description">
            {inAppName
              ? `You are in ${inAppName}. iPhone can only install this app from Safari.`
              : 'On iPhone, install from Safari (the compass icon) — not Chrome or in-app browsers.'}
          </p>
          <div className="ios-install-steps">
            <div className="ios-step">
              <span className="ios-step-number">1</span>
              <span className="ios-step-text">
                Tap <strong>···</strong> or <strong>Share</strong>, then <strong>Open in Safari</strong>
              </span>
            </div>
            <div className="ios-step">
              <span className="ios-step-number">2</span>
              <span className="ios-step-text">
                Or copy the link and paste it into <strong>Safari</strong>
              </span>
            </div>
          </div>
          <button className="pwa-install-primary" type="button" onClick={handleCopyLink}>
            {copied ? 'Link copied' : 'Copy link for Safari'}
          </button>
        </>
      )}

      {mode === 'ios' && (
        <>
          <p className="ios-install-description">
            Add this to your Home Screen. Then open it from the new icon so
            messages, prayers, and updates can notify you. Use Safari — this
            only takes a few taps.
          </p>

          <div className="ios-safari-bar" aria-hidden>
            <span className="ios-safari-bar-label">Safari toolbar</span>
            <span className="ios-share-hit">
              <ShareIcon />
              Share
            </span>
          </div>

          <div className="ios-install-steps">
            <div className="ios-step">
              <span className="ios-step-number">1</span>
              <span className="ios-step-text">
                Tap <strong>Share</strong>
                <span className="ios-share-icon">
                  <ShareIcon />
                </span>
                at the <strong>bottom</strong> of Safari (box with an arrow up)
              </span>
            </div>
            <div className="ios-step">
              <span className="ios-step-number">2</span>
              <span className="ios-step-text">
                In the sheet that pops up, <strong>scroll down</strong> and tap
                <span className="ios-add-home-chip">
                  <AddHomeIcon />
                  Add to Home Screen
                </span>
              </span>
            </div>
            <div className="ios-step">
              <span className="ios-step-number">3</span>
              <span className="ios-step-text">
                Tap <strong>Add</strong>, then open <strong>The Gathering</strong> from your Home Screen
              </span>
            </div>
          </div>

          <div className="ios-share-sheet-preview" aria-hidden>
            <div className="ios-share-sheet-title">Share sheet — keep scrolling</div>
            <div className="ios-share-sheet-row">AirDrop</div>
            <div className="ios-share-sheet-row">Messages</div>
            <div className="ios-share-sheet-row ios-share-sheet-row-highlight">
              <AddHomeIcon />
              Add to Home Screen
            </div>
          </div>
        </>
      )}

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
