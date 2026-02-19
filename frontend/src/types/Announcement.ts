export interface Announcement {
  id: string;
  userId: string;
  organizationId?: string;
  userName: string;
  userProfilePicUrl?: string;
  userRole: string;
  title: string;
  content: string;
  imageUrl?: string;
  isPinned: boolean;
  category: AnnouncementCategory;
  createdAt: string;
  updatedAt: string;
}

export type AnnouncementCategory = 
  | 'GENERAL'
  | 'WORSHIP'
  | 'EVENTS'
  | 'MINISTRY'
  | 'YOUTH'
  | 'MISSIONS'
  | 'PRAYER'
  | 'COMMUNITY'
  | 'URGENT'
  | 'CELEBRATION';

export interface AnnouncementCreateRequest {
  title: string;
  content: string;
  imageUrl?: string;
  category: AnnouncementCategory;
  isPinned?: boolean;
  isSystemWide?: boolean; // For PLATFORM_ADMIN: create system-wide announcement visible to all organizations
}

export interface AnnouncementUpdateRequest {
  title: string;
  content: string;
  imageUrl?: string;
  category: AnnouncementCategory;
  isPinned?: boolean;
  isSystemWide?: boolean; // For PLATFORM_ADMIN: update to system-wide announcement
}

export interface AnnouncementResponse {
  content: Announcement[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface AnnouncementStats {
  totalAnnouncements: number;
  pinnedAnnouncements: number;
}