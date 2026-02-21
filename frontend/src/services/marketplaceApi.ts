import api from './api';

export type MarketplaceSectionType = 'DONATION' | 'SHARING' | 'FOR_SALE';
export type MarketplacePostType = 'GIVE' | 'ASK';
export type MarketplaceListingStatus = 'ACTIVE' | 'RESERVED' | 'COMPLETED' | 'REMOVED' | 'EXPIRED';

export interface MarketplaceListing {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerProfilePicUrl?: string;
  ownerHeartsCount?: number;
  ownerWarningCount?: number;
  organizationId: string;
  organizationName: string;
  sectionType: MarketplaceSectionType;
  postType: MarketplacePostType;
  status: MarketplaceListingStatus;
  title: string;
  description?: string;
  category?: string;
  itemCondition?: string;
  priceAmount?: number;
  currency: string;
  locationLabel?: string;
  distanceRadiusKm?: number;
  latitude?: number;
  longitude?: number;
  locationSource?: string;
  geocodeStatus?: string;
  distanceMiles?: number;
  imageUrls: string[];
  viewCount: number;
  interestCount: number;
  messageCount: number;
  rankingScore?: number;
  isOwner?: boolean;
  owner?: boolean; // Backward-compatibility for legacy boolean serialization
  expiresAt?: string;
  completedAt?: string;
  createdAt: string | number[];
  updatedAt: string | number[];
}

export interface MarketplaceListingRequest {
  sectionType: MarketplaceSectionType;
  postType: MarketplacePostType;
  title: string;
  description?: string;
  category?: string;
  itemCondition?: string;
  priceAmount?: number;
  currency?: string;
  locationLabel?: string;
  distanceRadiusKm?: number;
  latitude?: number;
  longitude?: number;
  locationSource?: string;
  geocodeStatus?: string;
  imageUrls?: string[];
  expiresAt?: string;
  organizationId?: string;
}

export interface MarketplaceListingUpdateRequest extends Partial<MarketplaceListingRequest> {
  status?: MarketplaceListingStatus;
}

export interface MarketplaceListingsPage {
  content: MarketplaceListing[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface MarketplaceFilters {
  organizationId?: string;
  sectionType?: MarketplaceSectionType;
  postType?: MarketplacePostType;
  status?: MarketplaceListingStatus;
  category?: string;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  locationQuery?: string;
  viewerLatitude?: number;
  viewerLongitude?: number;
  radiusMiles?: number;
  page?: number;
  size?: number;
}

export interface MarketplaceMetrics {
  totalListings: number;
  activeListings: number;
  completedListings: number;
  donationListings: number;
  sharingListings: number;
  forSaleListings: number;
  completionRate: number;
  avgInterestPerListing: number;
}

const marketplaceApi = {
  getListings: async (filters: MarketplaceFilters = {}): Promise<MarketplaceListingsPage> => {
    const startedAt = Date.now();
    console.log('[MarketplaceAPI] getListings:start', { filters, startedAt });
    try {
      const response = await api.get('/marketplace/listings', { params: filters });
      console.log('[MarketplaceAPI] getListings:success', {
        status: response.status,
        count: response.data?.content?.length ?? 0,
        totalElements: response.data?.totalElements ?? 0,
        durationMs: Date.now() - startedAt
      });
      return response.data;
    } catch (error: any) {
      console.error('[MarketplaceAPI] getListings:error', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        filters,
        durationMs: Date.now() - startedAt
      });
      throw error;
    }
  },

  getListingById: async (listingId: string): Promise<MarketplaceListing> => {
    const response = await api.get(`/marketplace/listings/${listingId}`);
    return response.data;
  },

  createListing: async (request: MarketplaceListingRequest): Promise<MarketplaceListing> => {
    const startedAt = Date.now();
    console.log('[MarketplaceAPI] createListing:start', { request, startedAt });
    try {
      const response = await api.post('/marketplace/listings', request);
      console.log('[MarketplaceAPI] createListing:success', {
        status: response.status,
        listingId: response.data?.id,
        sectionType: response.data?.sectionType,
        durationMs: Date.now() - startedAt
      });
      return response.data;
    } catch (error: any) {
      console.error('[MarketplaceAPI] createListing:error', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        request,
        durationMs: Date.now() - startedAt
      });
      throw error;
    }
  },

  updateListing: async (listingId: string, request: MarketplaceListingUpdateRequest): Promise<MarketplaceListing> => {
    const response = await api.patch(`/marketplace/listings/${listingId}`, request);
    return response.data;
  },

  updateListingStatus: async (listingId: string, status: MarketplaceListingStatus): Promise<MarketplaceListing> => {
    const response = await api.patch(`/marketplace/listings/${listingId}/status`, { status });
    return response.data;
  },

  deleteListing: async (listingId: string): Promise<void> => {
    const startedAt = Date.now();
    console.log('[MarketplaceAPI] deleteListing:start', { listingId, startedAt });
    try {
      const response = await api.delete(`/marketplace/listings/${listingId}`);
      console.log('[MarketplaceAPI] deleteListing:success', {
        listingId,
        status: response.status,
        data: response.data,
        durationMs: Date.now() - startedAt
      });
    } catch (error: any) {
      console.error('[MarketplaceAPI] deleteListing:error', {
        listingId,
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        durationMs: Date.now() - startedAt
      });
      throw error;
    }
  },

  expressInterest: async (listingId: string): Promise<{ message: string; interestCount: number }> => {
    const response = await api.post(`/marketplace/listings/${listingId}/interest`);
    return response.data;
  },

  reportListing: async (listingId: string, reason: string, description?: string): Promise<{ message: string }> => {
    const response = await api.post(`/marketplace/listings/${listingId}/report`, { reason, description });
    return response.data;
  },

  messageSeller: async (listingId: string): Promise<{
    chatGroupId: string;
    chatGroupName: string;
    targetUserId: string;
    targetUserEmail: string;
  }> => {
    const response = await api.post(`/marketplace/listings/${listingId}/message-seller`);
    return response.data;
  },

  getMetrics: async (): Promise<MarketplaceMetrics> => {
    const response = await api.get('/marketplace/metrics');
    return response.data;
  }
};

export default marketplaceApi;
