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
  // YouTube video fields
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeThumbnailUrl?: string;
  youtubeDuration?: string;
  youtubeChannel?: string;
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
  // YouTube video fields
  youtubeUrl?: string;
  youtubeVideoId?: string;
  youtubeTitle?: string;
  youtubeThumbnailUrl?: string;
  youtubeDuration?: string;
  youtubeChannel?: string;
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
  
  if (fileType === 'video/youtube') return '🎥';
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType === 'application/pdf') return '📕';
  if (fileType.includes('word')) return '📘';
  if (fileType === 'text/plain') return '📝';
  
  return '📄';
};

// YouTube utility functions
export const isValidYouTubeUrl = (url: string): boolean => {
  if (!url || url.trim().length === 0) return false;
  
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/
  ];
  
  return youtubePatterns.some(pattern => pattern.test(url.trim()));
};

export const extractYouTubeVideoId = (url: string): string | null => {
  if (!url || url.trim().length === 0) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

export const generateYouTubeEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}`;
};

export const generateYouTubeThumbnailUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export const generateYouTubeWatchUrl = (videoId: string): string => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};

export const isYouTubeResource = (resource: Resource): boolean => {
  return !!(resource.youtubeVideoId || resource.fileType === 'video/youtube');
};