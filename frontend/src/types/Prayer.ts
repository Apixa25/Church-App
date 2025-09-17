export type PrayerCategory = 
  | 'HEALTH'
  | 'FAMILY'
  | 'PRAISE'
  | 'GUIDANCE'
  | 'HEALING'
  | 'SALVATION'
  | 'WORK'
  | 'TRAVEL'
  | 'GENERAL'
  | 'THANKSGIVING'
  | 'PROTECTION'
  | 'FINANCIAL'
  | 'RELATIONSHIPS';

export type PrayerStatus = 
  | 'ACTIVE'
  | 'ANSWERED'
  | 'RESOLVED'
  | 'ARCHIVED';

export type InteractionType = 
  | 'PRAY'
  | 'COMMENT'
  | 'ENCOURAGE'
  | 'AMEN'
  | 'HEART'
  | 'PRAISE';

export interface PrayerRequest {
  id: string;
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  title: string;
  description?: string;
  isAnonymous: boolean;
  category: PrayerCategory;
  status: PrayerStatus;
  createdAt: string | number[];
  updatedAt: string | number[];
  interactionSummary?: PrayerInteractionSummary;
}

export interface PrayerRequestCreateRequest {
  title: string;
  description?: string;
  isAnonymous?: boolean;
  category?: PrayerCategory;
}

export interface PrayerRequestUpdateRequest {
  title?: string;
  description?: string;
  isAnonymous?: boolean;
  category?: PrayerCategory;
  status?: PrayerStatus;
}

export interface PrayerInteraction {
  id: string;
  prayerRequestId: string;
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  type: InteractionType;
  content?: string;
  timestamp: string | number[];
}

export interface PrayerInteractionCreateRequest {
  prayerRequestId: string;
  type: InteractionType;
  content?: string;
}

export interface PrayerInteractionSummary {
  totalInteractions: number;
  totalComments: number;
  uniqueParticipants: number;
  interactionCounts: Record<InteractionType, number>;
}

export interface PrayerListResponse {
  content: PrayerRequest[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PrayerInteractionListResponse {
  content: PrayerInteraction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PrayerStats {
  activePrayerCount: number;
  answeredPrayerCount: number;
}

// Category labels for UI display
export const PRAYER_CATEGORY_LABELS: Record<PrayerCategory, string> = {
  HEALTH: 'Health',
  FAMILY: 'Family',
  PRAISE: 'Praise',
  GUIDANCE: 'Guidance',
  HEALING: 'Healing',
  SALVATION: 'Salvation',
  WORK: 'Work',
  TRAVEL: 'Travel',
  GENERAL: 'General',
  THANKSGIVING: 'Thanksgiving',
  PROTECTION: 'Protection',
  FINANCIAL: 'Financial',
  RELATIONSHIPS: 'Relationships'
};

// Status labels for UI display
export const PRAYER_STATUS_LABELS: Record<PrayerStatus, string> = {
  ACTIVE: 'Active',
  ANSWERED: 'Answered',
  RESOLVED: 'Resolved',
  ARCHIVED: 'Archived'
};

// Interaction type labels and emojis for UI display
export const INTERACTION_TYPE_LABELS: Record<InteractionType, { label: string; emoji: string }> = {
  PRAY: { label: 'Praying', emoji: '🙏' },
  COMMENT: { label: 'Comment', emoji: '💬' },
  ENCOURAGE: { label: 'Encourage', emoji: '💪' },
  AMEN: { label: 'Amen', emoji: '🙌' },
  HEART: { label: 'Love', emoji: '❤️' },
  PRAISE: { label: 'Praise', emoji: '🎉' }
};

// Category colors for UI styling
export const PRAYER_CATEGORY_COLORS: Record<PrayerCategory, string> = {
  HEALTH: '#e74c3c',
  FAMILY: '#9b59b6',
  PRAISE: '#f39c12',
  GUIDANCE: '#3498db',
  HEALING: '#2ecc71',
  SALVATION: '#e67e22',
  WORK: '#34495e',
  TRAVEL: '#1abc9c',
  GENERAL: '#95a5a6',
  THANKSGIVING: '#f1c40f',
  PROTECTION: '#8e44ad',
  FINANCIAL: '#27ae60',
  RELATIONSHIPS: '#e91e63'
};

// Status colors for UI styling
export const PRAYER_STATUS_COLORS: Record<PrayerStatus, string> = {
  ACTIVE: '#3498db',
  ANSWERED: '#2ecc71',
  RESOLVED: '#95a5a6',
  ARCHIVED: '#7f8c8d'
};