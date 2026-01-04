// ==================== WORSHIP ROOM TYPES ====================

export enum RoomType {
  LIVE = 'LIVE',           // Original plug.dj style - leader controls, everyone syncs
  TEMPLATE = 'TEMPLATE',   // Saved playlist that anyone can start
  LIVE_EVENT = 'LIVE_EVENT' // YouTube live stream with scheduling
}

export interface WorshipRoom {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;

  // Room type
  roomType: RoomType;

  // Creator details
  createdBy: string;
  createdByName: string;
  createdByProfilePic?: string;

  // Current leader details
  currentLeaderId?: string;
  currentLeaderName?: string;
  currentLeaderProfilePic?: string;

  // Current playback state
  currentVideoId?: string;
  currentVideoTitle?: string;
  currentVideoThumbnail?: string;
  playbackStatus: PlaybackStatus;
  playbackPosition: number;
  playbackStartedAt?: string;

  // Room settings
  isActive: boolean;
  isPrivate: boolean;
  maxParticipants?: number;
  participantCount: number;
  skipThreshold: number;

  // Live event fields
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  liveStreamUrl?: string;
  isLiveStreamActive?: boolean;
  autoStartEnabled?: boolean;
  autoCloseEnabled?: boolean;

  // Template/Playlist fields
  isTemplate?: boolean;
  allowUserStart?: boolean;
  playlistId?: string;
  playlistName?: string;
  playlistVideoCount?: number;
  playlistTotalDuration?: number;
  currentPlaylistPosition?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // User context
  isParticipant?: boolean;
  isCreator?: boolean;
  isCurrentLeader?: boolean;
  canJoin?: boolean;
  canStart?: boolean; // Can user start this template room
  userRole?: ParticipantRole;
  isInWaitlist?: boolean;
  waitlistPosition?: number;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface WorshipRoomRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  isPrivate?: boolean;
  maxParticipants?: number;
  skipThreshold?: number;

  // Room type
  roomType?: string; // 'LIVE' | 'TEMPLATE' | 'LIVE_EVENT'

  // Live event fields
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  liveStreamUrl?: string;
  autoStartEnabled?: boolean;
  autoCloseEnabled?: boolean;

  // Template/Playlist fields
  isTemplate?: boolean;
  allowUserStart?: boolean;
  playlistId?: string;
}

// ==================== QUEUE ENTRY TYPES ====================

export interface WorshipQueueEntry {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userProfilePic?: string;

  // Video details
  videoId: string;
  videoTitle: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;

  // Queue status
  position: number;
  status: QueueStatus;

  // Voting
  upvoteCount: number;
  skipVoteCount: number;
  userHasUpvoted?: boolean;
  userHasVotedSkip?: boolean;

  // Timestamps
  queuedAt: string;
  playedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface WorshipQueueEntryRequest {
  roomId: string;
  videoId: string;
  videoTitle: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;
}

// ==================== PARTICIPANT TYPES ====================

export interface WorshipRoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userProfilePic?: string;
  role: ParticipantRole;
  isActive: boolean;
  isInWaitlist: boolean;
  waitlistPosition?: number;
  joinedAt: string;
  lastActiveAt: string;
  updatedAt: string;
  avatar?: WorshipAvatar; // Animated avatar for dance floor
}

// ==================== AVATAR TYPES (Plug.dj-style animated avatars) ====================

/**
 * Animated avatar for worship room dance floor display.
 * Uses CSS sprite sheet animation with the steps() timing function.
 */
export interface WorshipAvatar {
  id: string;
  name: string;
  description?: string;
  /** URL to the sprite sheet PNG (horizontal strip of animation frames) */
  spriteSheetUrl: string;
  /** Number of animation frames in the sprite sheet */
  frameCount: number;
  /** Width of each frame in pixels */
  frameWidth: number;
  /** Height of each frame in pixels */
  frameHeight: number;
  /** Duration of one complete animation cycle in milliseconds */
  animationDurationMs: number;
  /** Whether this avatar is the user's currently selected one */
  isSelected?: boolean;
}

// ==================== VOTING TYPES ====================

export interface WorshipVoteRequest {
  queueEntryId: string;
  voteType: VoteType;
}

export enum VoteType {
  UPVOTE = 'UPVOTE',
  SKIP = 'SKIP'
}

// ==================== PLAY HISTORY TYPES ====================

export interface WorshipPlayHistory {
  id: string;
  videoId: string;
  videoTitle: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;
  playedAt: string;
  completedAt?: string;
  wasSkipped: boolean;
  upvoteCount: number;
  skipVoteCount: number;
  participantCount: number;
  leaderName?: string;
  leaderProfilePic?: string;
  leaderId?: string;
}

// ==================== PLAYBACK COMMAND TYPES ====================

export interface WorshipPlaybackCommand {
  roomId: string;
  action: PlaybackAction;
  videoId?: string;
  videoTitle?: string;
  videoThumbnail?: string;
  seekPosition?: number;
  scheduledPlayTime?: number; // Timestamp for sync
}

export enum PlaybackAction {
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  STOP = 'STOP',
  SKIP = 'SKIP',
  SEEK = 'SEEK'
}

// ==================== ROOM SETTINGS TYPES ====================

export interface WorshipRoomSettings {
  worshipRoomId: string;

  // Queue settings
  maxQueueSize: number;
  maxSongsPerUser: number;
  minSongDuration: number;
  maxSongDuration: number;

  // Voting settings
  skipThreshold: number;
  allowVoting: boolean;

  // Waitlist settings
  enableWaitlist: boolean;
  maxWaitlistSize: number;
  afkTimeoutMinutes: number;

  // Room behavior
  autoAdvanceQueue: boolean;
  allowDuplicateSongs: boolean;
  songCooldownHours: number;
  requireApproval: boolean;

  // Chat settings
  enableChat: boolean;
  slowModeSeconds: number;

  // Moderation
  bannedVideoIds?: string;
  allowedVideoCategories?: string;

  createdAt: string;
  updatedAt: string;
}

// ==================== ENUMS ====================

export enum PlaybackStatus {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

export enum QueueStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

export enum ParticipantRole {
  LISTENER = 'LISTENER',
  DJ = 'DJ',
  LEADER = 'LEADER',
  MODERATOR = 'MODERATOR'
}

// ==================== WEBSOCKET MESSAGE TYPES ====================

export interface WorshipWebSocketMessage {
  type: WorshipMessageType;
  roomId?: string;
  data?: any;
}

export enum WorshipMessageType {
  // Room events
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_DELETED = 'ROOM_DELETED',

  // Participant events
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  USER_PRESENCE = 'USER_PRESENCE',
  PARTICIPANT_ACTIVE = 'PARTICIPANT_ACTIVE',

  // Waitlist events
  USER_JOINED_WAITLIST = 'USER_JOINED_WAITLIST',
  USER_LEFT_WAITLIST = 'USER_LEFT_WAITLIST',

  // Queue events
  SONG_ADDED = 'SONG_ADDED',
  SONG_REMOVED = 'SONG_REMOVED',
  VOTE_UPDATED = 'VOTE_UPDATED',

  // Playback events
  NOW_PLAYING = 'NOW_PLAYING',
  PLAYBACK_COMMAND = 'PLAYBACK_COMMAND',
  PLAYBACK_STOPPED = 'PLAYBACK_STOPPED',
  SONG_SKIPPED = 'SONG_SKIPPED',
  SYNC_STATE = 'SYNC_STATE'
}

// ==================== PLAYLIST TYPES ====================

export interface WorshipPlaylist {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdBy: string;
  createdByName: string;
  createdByProfilePic?: string;
  isPublic: boolean;
  isActive: boolean;
  totalDuration: number;
  videoCount: number;
  playCount: number;
  createdAt: string;
  updatedAt: string;

  // User context
  isCreator?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;

  // Entries (optional - loaded separately or included)
  entries?: WorshipPlaylistEntry[];
}

export interface WorshipPlaylistEntry {
  id: string;
  playlistId: string;
  videoId: string;
  videoTitle: string;
  videoDuration?: number;
  videoThumbnail?: string;
  videoThumbnailUrl?: string; // Alias for backwards compatibility
  position: number;
  addedBy: string;
  addedByName: string;
  addedByProfilePic?: string;
  createdAt: string;
}

export interface WorshipPlaylistRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  isPublic?: boolean;
  entries?: WorshipPlaylistEntryRequest[];
}

export interface WorshipPlaylistEntryRequest {
  videoId: string;
  videoTitle: string;
  videoDuration?: number;
  videoThumbnail?: string;
  videoThumbnailUrl?: string; // Alias
  position?: number;
}

// ==================== YOUTUBE TYPES ====================

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  channelTitle: string;
  viewCount?: number;
  publishedAt?: string;
}

export interface YouTubeSearchResult {
  items: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

// ==================== HELPER FUNCTIONS ====================

export const getPlaybackStatusDisplay = (status: PlaybackStatus): string => {
  const displays: Record<PlaybackStatus, string> = {
    [PlaybackStatus.PLAYING]: 'Playing',
    [PlaybackStatus.PAUSED]: 'Paused',
    [PlaybackStatus.STOPPED]: 'Stopped'
  };
  return displays[status] || status;
};

export const getQueueStatusDisplay = (status: QueueStatus): string => {
  const displays: Record<QueueStatus, string> = {
    [QueueStatus.WAITING]: 'Waiting',
    [QueueStatus.PLAYING]: 'Playing',
    [QueueStatus.COMPLETED]: 'Completed',
    [QueueStatus.SKIPPED]: 'Skipped'
  };
  return displays[status] || status;
};

export const getParticipantRoleDisplay = (role: ParticipantRole): string => {
  const displays: Record<ParticipantRole, string> = {
    [ParticipantRole.LISTENER]: 'Listener',
    [ParticipantRole.DJ]: 'DJ',
    [ParticipantRole.LEADER]: 'Worship Leader',
    [ParticipantRole.MODERATOR]: 'Moderator'
  };
  return displays[role] || role;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatSkipPercentage = (skipVotes: number, totalParticipants: number): string => {
  if (totalParticipants === 0) return '0%';
  const percentage = (skipVotes / totalParticipants) * 100;
  return `${Math.round(percentage)}%`;
};

export const calculateUpvotePercentage = (upvotes: number, skipVotes: number): number => {
  const total = upvotes + skipVotes;
  if (total === 0) return 0;
  return (upvotes / total) * 100;
};

// YouTube video ID extraction (including live stream URLs)
export const extractYouTubeVideoId = (url: string): string | null => {
  const regexes = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/  // Live stream URL format
  ];

  for (const regex of regexes) {
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check if it's already just an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
};

// Check if a YouTube URL is a live stream
export const isYouTubeLiveUrl = (url: string): boolean => {
  return /youtube\.com\/live\//.test(url);
};

// Get YouTube thumbnail URL
export const getYouTubeThumbnail = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
};

// Check if user can perform actions based on role
export const canControlPlayback = (role?: ParticipantRole): boolean => {
  return role === ParticipantRole.LEADER || role === ParticipantRole.MODERATOR;
};

export const canAddToQueue = (role?: ParticipantRole): boolean => {
  return role === ParticipantRole.DJ ||
         role === ParticipantRole.LEADER ||
         role === ParticipantRole.MODERATOR;
};

export const canModerateRoom = (role?: ParticipantRole): boolean => {
  return role === ParticipantRole.MODERATOR;
};

export const canVote = (role?: ParticipantRole): boolean => {
  // All users except undefined role can vote
  return role !== undefined;
};

// Room type helpers
export const isLiveRoom = (room: WorshipRoom): boolean => {
  return room.roomType === RoomType.LIVE || !room.roomType;
};

export const isTemplateRoom = (room: WorshipRoom): boolean => {
  return room.roomType === RoomType.TEMPLATE;
};

export const isLiveEventRoom = (room: WorshipRoom): boolean => {
  return room.roomType === RoomType.LIVE_EVENT;
};

export const isLiveStreamActive = (room: WorshipRoom): boolean => {
  return isLiveEventRoom(room) && room.isLiveStreamActive === true;
};

export const isUpcomingEvent = (room: WorshipRoom): boolean => {
  return isLiveEventRoom(room) &&
         room.scheduledStartTime !== undefined &&
         room.isLiveStreamActive !== true;
};

export const getRoomTypeDisplay = (roomType: RoomType | string): string => {
  const displays: Record<string, string> = {
    [RoomType.LIVE]: 'Live Room',
    [RoomType.TEMPLATE]: 'Playlist Template',
    [RoomType.LIVE_EVENT]: 'Live Event'
  };
  return displays[roomType] || 'Room';
};

export const formatScheduledTime = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const formatPlaylistDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Check if scheduled event is starting soon (within 30 minutes)
export const isScheduledSoon = (scheduledTime?: string): boolean => {
  if (!scheduledTime) return false;
  const scheduled = new Date(scheduledTime).getTime();
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  return scheduled > now && scheduled - now <= thirtyMinutes;
};

// Check if scheduled event has passed
export const isScheduledPast = (scheduledTime?: string): boolean => {
  if (!scheduledTime) return false;
  return new Date(scheduledTime).getTime() < Date.now();
};
