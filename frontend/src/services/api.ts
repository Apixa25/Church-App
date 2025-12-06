import axios from 'axios';
import { UserProfile } from '../types/Profile';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    // Get valid access token (will refresh if needed)
    const { tokenService } = await import('./tokenService');
    const token = await tokenService.getValidAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors with automatic token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Prevent infinite retry loop

      try {
        // Attempt to refresh token
        const { tokenService } = await import('./tokenService');
        const refreshed = await tokenService.refreshTokenSilently();
        
        if (refreshed?.token) {
          // Update authorization header with new token
          originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
          
          // Retry the original request
          return api(originalRequest);
        } else {
          // Refresh failed - redirect to login
          throw error;
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        
        // Only redirect if we're not already on the login page
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  
  validateToken: () =>
    api.get('/auth/validate'),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  logout: () =>
    api.post('/auth/logout'),
};

// Profile API endpoints
export const profileAPI = {
  getMyProfile: () =>
    api.get('/profile/me'),
  
  getUserProfile: (userId: string) =>
    api.get(`/profile/${userId}`),
  
  updateMyProfile: (data: Partial<UserProfile>) =>
    api.put('/profile/me', data),
  
  uploadProfilePicture: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/me/upload-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  deleteProfilePicture: () =>
    api.delete('/profile/me/delete-picture'),
  
  getProfileCompletionStatus: () =>
    api.get('/profile/me/complete-status'),
  
  searchUsers: (query: string, page: number = 0, size: number = 20) =>
    api.get('/profile/search', {
      params: { query, page, size },
    }),
  
  getUserMemberships: (userId: string) =>
    api.get(`/organizations/users/${userId}/memberships`),
  
  // Social score - user likes (hearts)
  likeUser: (userId: string) =>
    api.post(`/profile/${userId}/like`),
  
  unlikeUser: (userId: string) =>
    api.delete(`/profile/${userId}/like`),
};

export default api;