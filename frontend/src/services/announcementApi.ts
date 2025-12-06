import axios from 'axios';
import { 
  Announcement, 
  AnnouncementCreateRequest, 
  AnnouncementUpdateRequest, 
  AnnouncementResponse,
  AnnouncementStats,
  AnnouncementCategory 
} from '../types/Announcement';

import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: `${API_BASE_URL}/announcements`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  // Get valid access token (will refresh if needed)
  const { tokenService } = await import('./tokenService');
  const token = await tokenService.getValidAccessToken();
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors with automatic token refresh
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

export const announcementAPI = {
  // Create announcement
  createAnnouncement: (data: AnnouncementCreateRequest) => 
    api.post<Announcement>('', data),

  // Create announcement with image
  createAnnouncementWithImage: (data: AnnouncementCreateRequest, imageFile: File) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('category', data.category);
    if (data.isPinned !== undefined) {
      formData.append('isPinned', data.isPinned.toString());
    }
    if (data.isSystemWide !== undefined) {
      formData.append('isSystemWide', data.isSystemWide.toString());
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return api.post<Announcement>('/with-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  // Get single announcement
  getAnnouncement: (id: string) => 
    api.get<Announcement>(`/${id}`),

  // Get all announcements with pagination
  getAllAnnouncements: (page: number = 0, size: number = 10) => 
    api.get<AnnouncementResponse>('', { params: { page, size } }),

  // Get announcements by category
  getAnnouncementsByCategory: (category: AnnouncementCategory, page: number = 0, size: number = 10) => 
    api.get<AnnouncementResponse>('', { params: { category, page, size } }),

  // Search announcements
  searchAnnouncements: (search: string, page: number = 0, size: number = 10) => 
    api.get<AnnouncementResponse>('', { params: { search, page, size } }),

  // Get pinned announcements
  getPinnedAnnouncements: () => 
    api.get<Announcement[]>('/pinned'),

  // Update announcement
  updateAnnouncement: (id: string, data: AnnouncementUpdateRequest) => 
    api.put<Announcement>(`/${id}`, data),

  // Delete announcement
  deleteAnnouncement: (id: string) => 
    api.delete(`/${id}`),

  // Pin announcement
  pinAnnouncement: (id: string) => 
    api.post<Announcement>(`/${id}/pin`),

  // Unpin announcement
  unpinAnnouncement: (id: string) => 
    api.post<Announcement>(`/${id}/unpin`),

  // Get stats
  getAnnouncementStats: () => 
    api.get<AnnouncementStats>('/stats'),

  // Get announcements for feed
  getAnnouncementsForFeed: (limit: number = 5) => 
    api.get<Announcement[]>('/feed', { params: { limit } })
};

export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action';
  }
  if (error.response?.status === 401) {
    return 'Please log in to continue';
  }
  if (error.response?.status >= 500) {
    return 'Server error. Please try again later';
  }
  return error.message || 'An unexpected error occurred';
};