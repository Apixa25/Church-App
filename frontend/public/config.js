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
  
  console.log('🔧 Runtime Config Loaded:', {
    hostname: hostname,
    apiUrl: window.config.API_URL
  });
})();

