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
      /** Map tile template for the church finder, e.g. https://tile.openstreetmap.org/{z}/{x}/{y}.png */
      MAP_TILE_URL?: string;
      /** HTML attribution string required by the tile provider */
      MAP_TILE_ATTRIBUTION?: string;
    };
  }
}

/**
 * OpenStreetMap's public tile server is fine for development and light traffic, but its usage
 * policy (https://operations.osmfoundation.org/policies/tiles/) asks heavy apps to use a
 * commercial provider (MapTiler, Stadia, Thunderforest...). Set MAP_TILE_URL / MAP_TILE_ATTRIBUTION
 * in public/config.js (or REACT_APP_MAP_TILE_URL at build time) to switch without code changes.
 */
const DEFAULT_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function getMapTileUrl(): string {
  return window.config?.MAP_TILE_URL || process.env.REACT_APP_MAP_TILE_URL || DEFAULT_MAP_TILE_URL;
}

export function getMapTileAttribution(): string {
  return (
    window.config?.MAP_TILE_ATTRIBUTION ||
    process.env.REACT_APP_MAP_TILE_ATTRIBUTION ||
    DEFAULT_MAP_TILE_ATTRIBUTION
  );
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

