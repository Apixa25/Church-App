// Post-related TypeScript interfaces for Church App Social Feed

// Define User interface here for convenience
export interface User {
  userId: string;
  id: string; // Alias for userId for compatibility
  email: string;
  name: string;
  role: string;
  profilePicUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  interests?: string[];
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  geocodeStatus?: string;
  birthday?: string;
  spiritualGift?: string;
  equippingGifts?: string;
  createdAt?: string;
}

export enum PostType {
  GENERAL = 'GENERAL',
  PRAYER = 'PRAYER',
  TESTIMONY = 'TESTIMONY',
  ANNOUNCEMENT = 'ANNOUNCEMENT'
}

export enum ShareType {
  REPOST = 'REPOST',
  QUOTE = 'QUOTE'
}

export enum FeedType {
  CHRONOLOGICAL = 'CHRONOLOGICAL',
  FOLLOWING = 'FOLLOWING',
  TRENDING = 'TRENDING',
  FOR_YOU = 'FOR_YOU'
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  thumbnailUrls?: string[]; // Optional thumbnail URLs for videos
  parentPostId?: string;
  quotedPostId?: string;
  isReply: boolean;
  isQuote: boolean;
  createdAt: string;
  updatedAt: string;
  postType: PostType;
  isAnonymous: boolean;
  category?: string;
  location?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  bookmarksCount: number;
  viewsCount?: number;

  // Social media embed fields
  externalUrl?: string;         // Original URL of the shared social media content
  externalPlatform?: string;    // Platform type: X_POST, FACEBOOK_REEL, INSTAGRAM_REEL, YOUTUBE
  externalEmbedHtml?: string;   // oEmbed HTML response for rendering embedded content

  // Computed fields (populated by frontend)
  isLikedByCurrentUser?: boolean;
  isBookmarkedByCurrentUser?: boolean;

  // Organization and Group info for post labeling
  organization?: {
    id: string;
    name: string;
    type: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  parentCommentId?: string;
  content: string;
  mediaUrls: string[];
  mediaTypes: string[];
  createdAt: string;
  updatedAt: string;
  isAnonymous: boolean;
  likesCount: number;

  // Computed fields
  isLikedByCurrentUser?: boolean;
  repliesCount?: number;
  replies?: Comment[];
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface PostShare {
  id: string;
  postId: string;
  userId: string;
  shareType: ShareType;
  content?: string;
  createdAt: string;
}

export interface PostBookmark {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface UserFollow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface Hashtag {
  id: string;
  tag: string;
  createdAt: string;
  usageCount: number;
  lastUsed: string;
}

// API Request/Response Types
export interface CreatePostRequest {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  postType?: PostType;
  category?: string;
  location?: string;
  anonymous?: boolean;
  // Multi-tenant fields
  organizationId?: string;
  groupId?: string;
  // Social media embed field
  externalUrl?: string;    // Optional: URL of social media content to embed (X, Facebook, Instagram, YouTube)
}

export interface CreateReplyRequest {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  anonymous?: boolean;
}

export interface CreateQuoteRequest {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

export interface CreateCommentRequest {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  parentCommentId?: string;
  anonymous?: boolean;
}

export interface SharePostRequest {
  shareType: ShareType;
  content?: string;
}

// Feed and Pagination Types
export interface FeedResponse {
  content: Post[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface CommentsResponse {
  content: Comment[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Search and Filter Types
export interface PostSearchFilters {
  query?: string;
  postType?: PostType;
  category?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  hasMedia?: boolean;
  isAnonymous?: boolean;
}

// Statistics Types
export interface PostStats {
  totalPosts: number;
  postsLast24Hours: number;
  averageLikesPerPost: number;
  averageCommentsPerPost: number;
  mostActiveUsers: UserActivity[];
}

export interface UserActivity {
  userId: string;
  userName: string;
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
}

// Notification Types
export interface PostNotification {
  id: string;
  type: 'like' | 'comment' | 'share' | 'mention';
  postId: string;
  postContent: string;
  actorId: string;
  actorName: string;
  actorProfilePicUrl?: string;
  createdAt: string;
  isRead: boolean;
}

// Media Types
export interface MediaFile {
  file: File;
  url: string;
  type: 'image' | 'video';
  name: string;
  size: number;
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

// UI State Types
export interface PostFormState {
  content: string;
  mediaFiles: MediaFile[];
  postType: PostType;
  category: string;
  location: string;
  isAnonymous: boolean;
  isSubmitting: boolean;
  error?: string;
}

export interface FeedState {
  posts: Post[];
  loading: boolean;
  error?: string;
  hasMore: boolean;
  currentPage: number;
  feedType: FeedType;
}

export interface CommentThreadState {
  comments: Comment[];
  loading: boolean;
  error?: string;
  replyingTo?: string;
  showReplies: { [commentId: string]: boolean };
}

// Helper type guards
export const isImageMedia = (mediaType: string): boolean => {
  return mediaType === 'image' || mediaType.startsWith('image/');
};

export const isVideoMedia = (mediaType: string): boolean => {
  return mediaType === 'video' || mediaType.startsWith('video/');
};

export const isValidPostType = (type: string): type is PostType => {
  return Object.values(PostType).includes(type as PostType);
};

export const isValidShareType = (type: string): type is ShareType => {
  return Object.values(ShareType).includes(type as ShareType);
};

// Type assertion helpers
export const assertPostType = (type: string): PostType => {
  if (!isValidPostType(type)) {
    throw new Error(`Invalid post type: ${type}`);
  }
  return type as PostType;
};

export const assertShareType = (type: string): ShareType => {
  if (!isValidShareType(type)) {
    throw new Error(`Invalid share type: ${type}`);
  }
  return type as ShareType;
};
