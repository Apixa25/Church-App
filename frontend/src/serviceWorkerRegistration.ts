// 🚀 The Gathering - Service Worker Registration
// This enables offline capabilities, faster load times, and automatic update notifications
// Learn more: https://cra.link/PWA

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

// Global update handler - can be set from App component
let globalUpdateHandler: ((registration: ServiceWorkerRegistration) => void) | null = null;

// Store the registration for periodic updates
let swRegistration: ServiceWorkerRegistration | null = null;

// How often to check for updates (in milliseconds)
// Default: every 5 minutes while app is open
const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

export function setUpdateHandler(handler: (registration: ServiceWorkerRegistration) => void) {
  globalUpdateHandler = handler;
}

// 🔄 Force check for updates - can be called manually
export function checkForUpdates(): Promise<boolean> {
  return new Promise((resolve) => {
    if (swRegistration) {
      console.log('🔍 Checking for service worker updates...');
      swRegistration.update()
        .then(() => {
          console.log('✅ Update check complete');
          resolve(true);
        })
        .catch((error) => {
          console.error('❌ Update check failed:', error);
          resolve(false);
        });
    } else {
      console.log('⚠️ No service worker registration found');
      resolve(false);
    }
  });
}

// 🗑️ Clear all caches - useful for debugging or forcing fresh content
export function clearAllCaches(): Promise<boolean> {
  return new Promise((resolve) => {
    if ('caches' in window) {
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          console.log('🗑️ All caches cleared');
          resolve(true);
        })
        .catch((error) => {
          console.error('❌ Failed to clear caches:', error);
          resolve(false);
        });
    } else {
      resolve(false);
    }
  });
}

// Start periodic update checks
function startPeriodicUpdateCheck(registration: ServiceWorkerRegistration) {
  // Check for updates periodically while the app is open
  setInterval(() => {
    console.log('🔄 Periodic update check...');
    registration.update().catch((error) => {
      console.log('Update check failed (may be offline):', error);
    });
  }, UPDATE_CHECK_INTERVAL);

  // Also check for updates when the page becomes visible again
  // This catches updates when user switches back to the app
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('👁️ App became visible, checking for updates...');
      registration.update().catch((error) => {
        console.log('Update check failed (may be offline):', error);
      });
    }
  });

  // Check for updates when coming back online
  window.addEventListener('online', () => {
    console.log('🌐 Back online, checking for updates...');
    registration.update().catch((error) => {
      console.log('Update check failed:', error);
    });
  });
}

export function register(config?: Config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Service worker is ready for offline use.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      // Store registration for periodic updates
      swRegistration = registration;
      
      // Start periodic update checks
      startPeriodicUpdateCheck(registration);
      
      console.log('✅ Service Worker registered successfully');
      
      // Check if there's already a waiting service worker
      // (This can happen if the user opened multiple tabs)
      if (registration.waiting) {
        console.log('📦 Update already waiting, triggering notification');
        if (config && config.onUpdate) {
          config.onUpdate(registration);
        }
        if (globalUpdateHandler) {
          globalUpdateHandler(registration);
        }
      }
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        console.log('🔄 New service worker installing...');
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('🎉 New content available! Showing update notification.');
              // Call both config callback and global handler
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
              if (globalUpdateHandler) {
                globalUpdateHandler(registration);
              }
            } else {
              console.log('📦 Content cached for offline use.');
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('❌ Error registering service worker:', error);
    });
}

function checkValidServiceWorker(swUrl: string, config?: Config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection. App running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
