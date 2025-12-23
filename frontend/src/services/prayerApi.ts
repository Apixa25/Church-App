import axios from 'axios';
import {
  PrayerRequest,
  PrayerRequestCreateRequest,
  PrayerRequestUpdateRequest,
  PrayerListResponse,
  PrayerInteractionListResponse,
  PrayerStats,
  PrayerCategory,
  PrayerStatus,
  PrayerInteraction,
  PrayerInteractionCreateRequest,
  PrayerInteractionSummary,
  PrayerParticipant
} from '../types/Prayer';

import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

// Create axios instance WITHOUT default Content-Type
// We'll set it dynamically in the interceptor based on request type
const api = axios.create({
  baseURL: API_BASE_URL,
  // DO NOT set default Content-Type here - let interceptor handle it
  // This prevents FormData requests from getting the wrong Content-Type
});

// Request interceptor to add auth token and handle FormData
api.interceptors.request.use(
  async (config) => {
    // Get valid access token (will refresh if needed)
    const { tokenService } = await import('./tokenService');
    const token = await tokenService.getValidAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL: Detect FormData and remove Content-Type header
    // iPhone Safari sometimes doesn't properly identify FormData with instanceof
    // So we check multiple ways to be sure
    const isFormData = 
      config.data instanceof FormData ||
      (config.data && typeof config.data === 'object' && config.data.constructor?.name === 'FormData') ||
      (config.data && typeof config.data === 'object' && 'append' in config.data && typeof config.data.append === 'function') ||
      // Also check if Content-Type was explicitly set to undefined (our signal)
      (config.headers && (config.headers['Content-Type'] === undefined || config.headers['content-type'] === undefined));
    
    if (isFormData || config.url?.includes('/with-image')) {
      // AGGRESSIVE: Remove Content-Type header in ALL possible ways
      // Browser MUST set it automatically with boundary for multipart/form-data
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      delete config.headers['Content-type'];
      delete config.headers['CONTENT-TYPE'];

      // Also set to undefined to ensure it's not added back
      if (config.headers) {
        config.headers['Content-Type'] = undefined as any;
        config.headers['content-type'] = undefined as any;
      }
    } else {
      // Not FormData - keep Content-Type as is (or set to JSON if not set)
      if (!config.headers['Content-Type'] && !config.headers['content-type']) {
        config.headers['Content-Type'] = 'application/json';
      }
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

// Prayer Request API endpoints
export const prayerAPI = {
  // Create a new prayer request
  createPrayerRequest: (data: PrayerRequestCreateRequest) =>
    api.post<PrayerRequest>('/prayers', data),

  // Create a new prayer request with image
  createPrayerRequestWithImage: async (data: PrayerRequestCreateRequest, imageFile?: File) => {
    // Validate file before creating FormData
    if (imageFile) {
      if (!(imageFile instanceof File)) {
        throw new Error('Invalid image file object');
      }
      if (imageFile.size === 0) {
        throw new Error('Image file is empty');
      }
    }
    
    try {
      const formData = new FormData();
      
      // Append text fields first
      formData.append('title', data.title);
      if (data.description) {
        formData.append('description', data.description);
      }
      if (data.isAnonymous !== undefined) {
        formData.append('isAnonymous', data.isAnonymous.toString());
      }
      if (data.category) {
        formData.append('category', data.category);
      }
      if (data.organizationId) {
        formData.append('organizationId', data.organizationId);
      }
      
      // Append file last (some browsers are sensitive to order)
      if (imageFile) {
        try {
          formData.append('image', imageFile, imageFile.name); // Include filename explicitly
          // Verify it was appended
          const hasImage = formData.has('image');

          if (!hasImage) {
            throw new Error('Failed to append image to FormData');
          }
        } catch (appendError) {
          throw new Error('Failed to prepare image for upload. Please try again.');
        }
      }

      // Verify FormData is actually a FormData object
      if (!(formData instanceof FormData)) {
        throw new Error('FormData creation failed - invalid FormData object');
      }
      
      // iPhone Safari workaround: Use native fetch for FormData to avoid Axios issues
      const userAgent = navigator.userAgent;
      const isIPhone = /iPhone|iPod/.test(userAgent);

      if (isIPhone) {
        
        // Get auth token
        const { tokenService } = await import('./tokenService');
        const token = await tokenService.getValidAccessToken();
        
        // Use native fetch - browser handles FormData correctly
        // DO NOT set Content-Type - browser MUST set it with boundary automatically
        const url = `${API_BASE_URL}/prayers/with-image`;
        
        // Handle timeout with AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        
        try {
          const fetchResponse = await fetch(url, {
            method: 'POST',
            body: formData,
            // DO NOT set Content-Type header - browser will set multipart/form-data with boundary
            headers: {
              'Authorization': `Bearer ${token || ''}`,
              // Explicitly omit Content-Type - let browser handle it
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json().catch(() => ({ error: fetchResponse.statusText }));
            throw {
              response: {
                status: fetchResponse.status,
                statusText: fetchResponse.statusText,
                data: errorData
              }
            };
          }
          
          const responseData = await fetchResponse.json();
          return { data: responseData };
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            const timeoutError = new Error('Request timeout') as any;
            timeoutError.code = 'ECONNABORTED';
            throw timeoutError;
          }
          throw fetchError;
        }
      } else {
        // Use Axios for non-iPhone devices
        const requestConfig = {
          timeout: 90000,
          headers: {
            'Content-Type': undefined as any,
          },
          transformRequest: [(data: any) => {
            if (data instanceof FormData) {
              return data;
            }
            return data;
          }]
        };
        
        return api.post<PrayerRequest>('/prayers/with-image', formData, requestConfig);
      }
    } catch (formDataError: any) {
      throw formDataError;
    }
  },

  // Get a single prayer request by ID
  getPrayerRequest: (id: string) =>
    api.get<PrayerRequest>(`/prayers/${id}`),

  // Update a prayer request
  updatePrayerRequest: (id: string, data: PrayerRequestUpdateRequest) =>
    api.put<PrayerRequest>(`/prayers/${id}`, data),

  // Update a prayer request with image
  updatePrayerRequestWithImage: (id: string, data: PrayerRequestUpdateRequest, imageFile?: File) => {
    const formData = new FormData();
    if (data.title) {
      formData.append('title', data.title);
    }
    if (data.description !== undefined) {
      formData.append('description', data.description || '');
    }
    if (data.isAnonymous !== undefined) {
      formData.append('isAnonymous', data.isAnonymous.toString());
    }
    if (data.category) {
      formData.append('category', data.category);
    }
    if (data.status) {
      formData.append('status', data.status);
    }
    if (data.imageUrl !== undefined) {
      formData.append('imageUrl', data.imageUrl || '');
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    return api.put<PrayerRequest>(`/prayers/${id}/with-image`, formData, {
      // CRITICAL: Do NOT set Content-Type manually - browser must set it with boundary
      // The request interceptor will automatically delete Content-Type for FormData
      // The browser will automatically set: multipart/form-data; boundary=----WebKitFormBoundary...
      timeout: 90000 // 90 second timeout for file uploads (mobile networks can be slow)
    });
  },

  // Delete a prayer request
  deletePrayerRequest: (id: string) =>
    api.delete(`/prayers/${id}`),

  // Get all prayer requests (paginated)
  getAllPrayerRequests: (page: number = 0, size: number = 20, organizationId?: string) =>
    api.get<PrayerListResponse>('/prayers', {
      params: { page, size, organizationId }
    }),

  // Get my prayer requests
  getMyPrayerRequests: () =>
    api.get<PrayerRequest[]>('/prayers/my-prayers'),

  // Get prayer requests by category
  getPrayerRequestsByCategory: (category: PrayerCategory, page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>(`/prayers/category/${category}`, {
      params: { page, size }
    }),

  // Get prayer requests by status
  getPrayerRequestsByStatus: (status: PrayerStatus, page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>(`/prayers/status/${status}`, {
      params: { page, size }
    }),

  // Search prayer requests
  searchPrayerRequests: (query: string, page: number = 0, size: number = 20) =>
    api.get<PrayerListResponse>('/prayers/search', {
      params: { query, page, size }
    }),

  // Get available categories
  getPrayerCategories: () =>
    api.get<PrayerCategory[]>('/prayers/categories'),

  // Get available statuses
  getPrayerStatuses: () =>
    api.get<PrayerStatus[]>('/prayers/statuses'),

  // Get prayer statistics
  getPrayerStats: () =>
    api.get<PrayerStats>('/prayers/stats'),

  // Get active prayers for prayer sheet
  getPrayerSheet: () =>
    api.get<PrayerRequest[]>('/prayers/sheet'),
};

// Prayer Interaction API endpoints
export const prayerInteractionAPI = {
  // Create a new interaction (reaction or comment)
  createInteraction: (data: PrayerInteractionCreateRequest) =>
    api.post<PrayerInteraction | { message: string; action: string }>('/prayer-interactions', data),

  // Delete an interaction
  deleteInteraction: (id: string) =>
    api.delete(`/prayer-interactions/${id}`),

  // Get all interactions for a prayer request
  getInteractionsByPrayer: (prayerRequestId: string, page?: number, size?: number) => {
    const params = page !== undefined && size !== undefined ? { page, size } : {};
    return api.get<PrayerInteraction[] | PrayerListResponse>(`/prayer-interactions/prayer/${prayerRequestId}`, {
      params
    });
  },

  // Get only comments for a prayer request
  getCommentsByPrayer: (prayerRequestId: string, page?: number, size?: number) => {
    const params = page !== undefined && size !== undefined ? { page, size } : {};
    return api.get<PrayerInteraction[] | PrayerInteractionListResponse>(`/prayer-interactions/prayer/${prayerRequestId}/comments`, {
      params
    });
  },

  // Get only reactions for a prayer request
  getReactionsByPrayer: (prayerRequestId: string) =>
    api.get<PrayerInteraction[]>(`/prayer-interactions/prayer/${prayerRequestId}/reactions`),

  // Get interaction summary for a prayer request
  getInteractionSummary: (prayerRequestId: string) =>
    api.get<PrayerInteractionSummary>(`/prayer-interactions/prayer/${prayerRequestId}/summary`),

  // Get my interactions
  getMyInteractions: () =>
    api.get<PrayerInteraction[]>('/prayer-interactions/my-interactions'),

  // Check if user has interacted with a prayer in a specific way
  checkUserInteraction: (prayerRequestId: string, type: string) =>
    api.get<{ hasInteracted: boolean; type: string; prayerRequestId: string }>(`/prayer-interactions/check-interaction/${prayerRequestId}/${type}`),

  // Get available interaction types
  getInteractionTypes: () =>
    api.get<string[]>('/prayer-interactions/types'),

  // Get recent interactions (for dashboard)
  getRecentInteractions: (limit: number = 10) =>
    api.get<PrayerInteraction[]>('/prayer-interactions/recent', {
      params: { limit }
    }),

  // Get unique participants who have interacted with a prayer
  getParticipants: (prayerRequestId: string) =>
    api.get<PrayerParticipant[]>(`/prayer-interactions/prayer/${prayerRequestId}/participants`),

  // Get comments that others have made on prayers owned by a specific user
  // This is for the "Comments on my content" tab in user profiles
  getCommentsReceivedByUser: (userId: string, page: number = 0, size: number = 20) =>
    api.get<PrayerInteractionListResponse>(`/prayer-interactions/user/${userId}/comments-received`, {
      params: { page, size }
    }),

  // Get count of comments received on prayers owned by a specific user
  getCommentsReceivedCount: (userId: string) =>
    api.get<{ count: number }>(`/prayer-interactions/user/${userId}/comments-received-count`),
};

// Utility functions for API responses
export const handleApiError = (error: any): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isApiResponse = <T>(response: any): response is { data: T } => {
  return response && typeof response === 'object' && 'data' in response;
};