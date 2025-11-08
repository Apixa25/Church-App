// ==================== WORSHIP ROOM TYPES ====================

export interface WorshipRoom {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;

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

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // User context
  isParticipant?: boolean;
  isCreator?: boolean;
  isCurrentLeader?: boolean;
  canJoin?: boolean;
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

// YouTube video ID extraction
export const extractYouTubeVideoId = (url: string): string | null => {
  const regexes = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
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
