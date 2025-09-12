export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: ResourceCategory;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  uploadedById: string;
  uploaderName: string;
  uploaderProfilePicUrl?: string;
  isApproved?: boolean;
  downloadCount: number;
  createdAt: string;
}

export enum ResourceCategory {
  GENERAL = 'GENERAL',
  BIBLE_STUDY = 'BIBLE_STUDY',
  DEVOTIONAL = 'DEVOTIONAL',
  SERMON = 'SERMON',
  WORSHIP = 'WORSHIP',
  PRAYER = 'PRAYER',
  YOUTH = 'YOUTH',
  CHILDREN = 'CHILDREN',
  MENS_MINISTRY = 'MENS_MINISTRY',
  WOMENS_MINISTRY = 'WOMENS_MINISTRY',
  SMALL_GROUPS = 'SMALL_GROUPS',
  MINISTRY_RESOURCES = 'MINISTRY_RESOURCES',
  ANNOUNCEMENTS = 'ANNOUNCEMENTS',
  FORMS = 'FORMS',
  POLICIES = 'POLICIES',
  TRAINING = 'TRAINING',
  MUSIC = 'MUSIC',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENTS = 'DOCUMENTS',
  IMAGES = 'IMAGES',
  OTHER = 'OTHER'
}

export interface ResourceRequest {
  title: string;
  description?: string;
  category?: ResourceCategory;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
}

export interface ResourceResponse {
  resources: Resource[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
}

export interface ResourceStats {
  totalApproved: number;
  totalPending: number;
  recentCount: number;
}

export interface FileValidation {
  valid: boolean;
  filename: string;
  size: number;
  type: string;
  suggestedCategory: ResourceCategory;
  error?: string;
}

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  [ResourceCategory.GENERAL]: 'General',
  [ResourceCategory.BIBLE_STUDY]: 'Bible Study',
  [ResourceCategory.DEVOTIONAL]: 'Devotional',
  [ResourceCategory.SERMON]: 'Sermon',
  [ResourceCategory.WORSHIP]: 'Worship',
  [ResourceCategory.PRAYER]: 'Prayer',
  [ResourceCategory.YOUTH]: 'Youth',
  [ResourceCategory.CHILDREN]: 'Children',
  [ResourceCategory.MENS_MINISTRY]: "Men's Ministry",
  [ResourceCategory.WOMENS_MINISTRY]: "Women's Ministry",
  [ResourceCategory.SMALL_GROUPS]: 'Small Groups',
  [ResourceCategory.MINISTRY_RESOURCES]: 'Ministry Resources',
  [ResourceCategory.ANNOUNCEMENTS]: 'Announcements',
  [ResourceCategory.FORMS]: 'Forms',
  [ResourceCategory.POLICIES]: 'Policies',
  [ResourceCategory.TRAINING]: 'Training',
  [ResourceCategory.MUSIC]: 'Music',
  [ResourceCategory.AUDIO]: 'Audio',
  [ResourceCategory.VIDEO]: 'Video',
  [ResourceCategory.DOCUMENTS]: 'Documents',
  [ResourceCategory.IMAGES]: 'Images',
  [ResourceCategory.OTHER]: 'Other'
};

export const getResourceCategoryLabel = (category: ResourceCategory): string => {
  return RESOURCE_CATEGORY_LABELS[category] || category;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIconByType = (fileType?: string): string => {
  if (!fileType) return '📄';
  
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType === 'application/pdf') return '📕';
  if (fileType.includes('word')) return '📘';
  if (fileType === 'text/plain') return '📝';
  
  return '📄';
};