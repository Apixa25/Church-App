// Runtime Configuration for The Gathering App
// This file is loaded before the React app starts
// You can modify this file without rebuilding the app

(function() {
  'use strict';
  
  // Detect the current environment based on hostname
  const hostname = window.location.hostname;
  
  // Determine API URL based on hostname
  let apiUrl;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    // Local development
    apiUrl = 'http://localhost:8083/api';
  } else if (hostname.includes('thegathrd.com') || hostname.includes('thegathrd')) {
    // Production
    apiUrl = 'https://api.thegathrd.com/api';
  } else {
    // Default to production for unknown hosts
    apiUrl = 'https://api.thegathrd.com/api';
  }
  
  // Create global config object
  window.config = window.config || {};
  
  // Set API URL (can be overridden by setting window.config.API_URL before this script runs)
  window.config.API_URL = window.config.API_URL || apiUrl;

  // Optional: map tiles for the "churches near me" finder. Leave unset to use the public
  // OpenStreetMap tile server (fine for development / light traffic). For production scale,
  // point these at a tile provider account, e.g.
  //   window.config.MAP_TILE_URL = 'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=YOUR_KEY';
  //   window.config.MAP_TILE_ATTRIBUTION = '&copy; MapTiler &copy; OpenStreetMap contributors';
})();

