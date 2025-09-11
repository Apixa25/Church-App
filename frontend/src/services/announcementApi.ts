import axios from 'axios';
import { 
  Announcement, 
  AnnouncementCreateRequest, 
  AnnouncementUpdateRequest, 
  AnnouncementResponse,
  AnnouncementStats,
  AnnouncementCategory 
} from '../types/Announcement';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: `${API_BASE_URL}/announcements`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const announcementAPI = {
  // Create announcement
  createAnnouncement: (data: AnnouncementCreateRequest) => 
    api.post<Announcement>('/', data),

  // Get single announcement
  getAnnouncement: (id: string) => 
    api.get<Announcement>(`/${id}`),

  // Get all announcements with pagination
  getAllAnnouncements: (page: number = 0, size: number = 10) => 
    api.get<AnnouncementResponse>('/', { params: { page, size } }),

  // Get announcements by category
  getAnnouncementsByCategory: (category: AnnouncementCategory, page: number = 0, size: number = 10) => 
    api.get<AnnouncementResponse>('/', { params: { category, page, size } }),

  // Search announcements
  searchAnnouncements: (search: string, page: number = 0, size: number = 10) => 
    api.get<AnnouncementResponse>('/', { params: { search, page, size } }),

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