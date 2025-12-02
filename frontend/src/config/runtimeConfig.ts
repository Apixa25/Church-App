/**
 * Runtime Configuration Utility
 * 
 * This reads configuration from window.config that was set by config.js
 * This allows us to change the API URL without rebuilding the app.
 */

// Type definition for window.config
declare global {
  interface Window {
    config?: {
      API_URL?: string;
    };
  }
}

/**
 * Get the API base URL from runtime configuration
 * Falls back to environment variable or localhost for development
 */
export function getApiUrl(): string {
  // First, try runtime config (set by config.js)
  if (window.config?.API_URL) {
    return window.config.API_URL;
  }
  
  // Fallback to build-time environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Final fallback for local development
  return 'http://localhost:8083/api';
}

/**
 * Get the current API URL (for debugging)
 */
export function getCurrentApiUrl(): string {
  return getApiUrl();
}

