export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  bio?: string;
  location?: string;
  website?: string;
  interests?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodeStatus?: string | null;
  birthday?: string;
  spiritualGift?: string;
  equippingGifts?: string;
  role: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  profilePicUrl?: string;
  bannerImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  followerCount?: number;
  followingCount?: number;
}

export interface ProfileUpdateRequest {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  interests?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  geocodeStatus?: string | null;
  birthday?: string;
  spiritualGift?: string;
  equippingGifts?: string;
  role?: 'MEMBER' | 'MODERATOR' | 'ADMIN';
  profilePicUrl?: string;
  bannerImageUrl?: string;
}

export interface ProfileCompletionStatus {
  isComplete: boolean;
  userId: string;
  profileCompletionPercentage: number;
}

export interface FileUploadResponse {
  fileUrl?: string;
  message: string;
  success: boolean;
}