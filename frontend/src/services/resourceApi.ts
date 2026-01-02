import api from './api';
import { Resource, ResourceRequest, ResourceResponse, ResourceStats, FileValidation, ResourceCategory } from '../types/Resource';

export const resourceAPI = {
  // Public endpoints (approved resources only)
  getApprovedResources: (page = 0, size = 20, category?: string, search?: string, fileType?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    if (fileType) params.append('fileType', fileType);
    
    return api.get<ResourceResponse>(`/resources?${params.toString()}`);
  },

  getResource: (resourceId: string) =>
    api.get<Resource>(`/resources/${resourceId}`),

  trackDownload: (resourceId: string) =>
    api.post(`/resources/${resourceId}/download`),

  trackShare: (resourceId: string) =>
    api.post(`/resources/${resourceId}/share`),

  // Public resource endpoint (no authentication required)
  getPublicResource: (resourceId: string) =>
    api.get(`/public/resources/${resourceId}`),

  // Authenticated endpoints
  createResource: (resourceRequest: ResourceRequest) =>
    api.post<Resource>('/resources', resourceRequest),

  updateResource: (resourceId: string, resourceRequest: ResourceRequest) =>
    api.put<Resource>(`/resources/${resourceId}`, resourceRequest),

  deleteResource: (resourceId: string) =>
    api.delete(`/resources/${resourceId}`),

  // User's own resources
  getUserResources: (page = 0, size = 20, approved?: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    if (approved !== undefined) params.append('approved', approved.toString());
    
    return api.get<ResourceResponse>(`/resources/my-resources?${params.toString()}`);
  },

  // File upload endpoints
  createResourceWithFile: (formData: FormData) =>
    api.post<Resource>('/resources/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  updateResourceFile: (resourceId: string, formData: FormData) =>
    api.put<Resource>(`/resources/${resourceId}/file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  removeResourceFile: (resourceId: string) =>
    api.delete(`/resources/${resourceId}/file`),

  validateFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post<FileValidation>('/resources/validate-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Admin endpoints
  getAllResources: (page = 0, size = 20, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    if (search) params.append('search', search);
    
    return api.get<ResourceResponse>(`/resources/admin/all?${params.toString()}`);
  },

  getPendingResources: (page = 0, size = 20) => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    
    return api.get<ResourceResponse>(`/resources/admin/pending?${params.toString()}`);
  },

  approveResource: (resourceId: string) =>
    api.post<Resource>(`/resources/admin/${resourceId}/approve`),

  rejectResource: (resourceId: string) =>
    api.post<Resource>(`/resources/admin/${resourceId}/reject`),

  // Statistics and feed endpoints
  getResourceStats: () =>
    api.get<ResourceStats>('/resources/stats'),

  getRecentResourcesForFeed: (limit = 10) =>
    api.get<Resource[]>(`/resources/feed/recent?limit=${limit}`),

  getPopularResources: (limit = 10) =>
    api.get<Resource[]>(`/resources/feed/popular?limit=${limit}`),
};

// Helper functions for building form data
export const buildResourceFormData = (
  title: string,
  description: string,
  category: ResourceCategory,
  file?: File
): FormData => {
  const formData = new FormData();
  formData.append('title', title);
  if (description) formData.append('description', description);
  formData.append('category', category);
  if (file) formData.append('file', file);
  
  return formData;
};

export const buildFileFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
};