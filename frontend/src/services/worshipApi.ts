import api from './api';
import {
  WorshipRoom,
  WorshipRoomRequest,
  WorshipQueueEntry,
  WorshipQueueEntryRequest,
  WorshipRoomParticipant,
  WorshipVoteRequest,
  WorshipRoomSettings,
  WorshipPlaylist,
  WorshipPlaylistRequest,
  WorshipPlaylistEntry,
  WorshipPlaylistEntryRequest,
  WorshipPlayHistory
} from '../types/Worship';

export const worshipAPI = {
  // ==================== ROOM OPERATIONS ====================

  // Get all rooms
  getRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms'),

  // Get public rooms only
  getPublicRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/public'),

  // Get user's rooms (where user is a participant)
  getMyRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/my-rooms'),

  // Alias for getUserRooms
  getUserRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/my-rooms'),

  // Get currently playing rooms
  getPlayingRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/playing'),

  // Alias for getCurrentlyPlayingRooms
  getCurrentlyPlayingRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/playing'),

  // Get specific room details
  getRoom: (roomId: string): Promise<{ data: WorshipRoom }> =>
    api.get(`/worship/rooms/${roomId}`),

  // Alias for getRoomById
  getRoomById: (roomId: string): Promise<{ data: WorshipRoom }> =>
    api.get(`/worship/rooms/${roomId}`),

  // Create new room
  createRoom: (roomData: WorshipRoomRequest): Promise<{ data: WorshipRoom }> =>
    api.post('/worship/rooms', roomData),

  // Update room
  updateRoom: (roomId: string, roomData: WorshipRoomRequest): Promise<{ data: WorshipRoom }> =>
    api.put(`/worship/rooms/${roomId}`, roomData),

  // Delete room
  deleteRoom: (roomId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/worship/rooms/${roomId}`),

  // ==================== PARTICIPANT OPERATIONS ====================

  // Join a room
  joinRoom: (roomId: string): Promise<{ data: WorshipRoom }> =>
    api.post(`/worship/rooms/${roomId}/join`),

  // Leave a room
  leaveRoom: (roomId: string): Promise<{ data: { message: string } }> =>
    api.post(`/worship/rooms/${roomId}/leave`),

  // Get room participants
  getParticipants: (roomId: string): Promise<{ data: WorshipRoomParticipant[] }> =>
    api.get(`/worship/rooms/${roomId}/participants`),

  // ==================== WAITLIST OPERATIONS ====================

  // Join waitlist to become DJ
  joinWaitlist: (roomId: string): Promise<{ data: { message: string } }> =>
    api.post(`/worship/rooms/${roomId}/waitlist/join`),

  // Leave waitlist
  leaveWaitlist: (roomId: string): Promise<{ data: { message: string } }> =>
    api.post(`/worship/rooms/${roomId}/waitlist/leave`),

  // Get waitlist
  getWaitlist: (roomId: string): Promise<{ data: WorshipRoomParticipant[] }> =>
    api.get(`/worship/rooms/${roomId}/waitlist`),

  // ==================== QUEUE OPERATIONS ====================

  // Get queue for a room
  getQueue: (roomId: string): Promise<{ data: WorshipQueueEntry[] }> =>
    api.get(`/worship/rooms/${roomId}/queue`),

  // Get currently playing song
  getNowPlaying: (roomId: string): Promise<{ data: WorshipQueueEntry | { message: string } }> =>
    api.get(`/worship/rooms/${roomId}/queue/now-playing`),

  // Alias for getCurrentlyPlaying
  getCurrentlyPlaying: (roomId: string): Promise<{ data: WorshipQueueEntry | { message: string } }> =>
    api.get(`/worship/rooms/${roomId}/queue/now-playing`),

  // Add song to queue
  addToQueue: (roomId: string, songData: Omit<WorshipQueueEntryRequest, 'roomId'>): Promise<{ data: WorshipQueueEntry }> =>
    api.post(`/worship/rooms/${roomId}/queue`, songData),

  // Remove song from queue
  removeFromQueue: (queueEntryId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/worship/queue/${queueEntryId}`),

  // ==================== PLAY HISTORY OPERATIONS ====================

  // Get room play history
  getRoomHistory: (roomId: string, limit: number = 20): Promise<{ data: WorshipPlayHistory[] }> =>
    api.get(`/worship/rooms/${roomId}/history?limit=${limit}`),

  // ==================== VOTING OPERATIONS ====================

  // Vote on a song (upvote or skip)
  vote: (voteData: WorshipVoteRequest): Promise<{ data: WorshipQueueEntry }> =>
    api.post('/worship/vote', voteData),

  // ==================== PLAYBACK CONTROL OPERATIONS ====================

  // Play next song in queue
  playNext: (roomId: string): Promise<{ data: WorshipQueueEntry }> =>
    api.post(`/worship/rooms/${roomId}/play-next`),

  // Skip current song
  skipSong: (roomId: string): Promise<{ data: { message: string } }> =>
    api.post(`/worship/rooms/${roomId}/skip`),

  // Alias for skip
  skip: (roomId: string): Promise<{ data: { message: string } }> =>
    api.post(`/worship/rooms/${roomId}/skip`),

  // ==================== SETTINGS OPERATIONS ====================

  // Get room settings
  getSettings: (roomId: string): Promise<{ data: WorshipRoomSettings }> =>
    api.get(`/worship/rooms/${roomId}/settings`),

  // Update room settings
  updateSettings: (roomId: string, settings: Partial<WorshipRoomSettings>): Promise<{ data: WorshipRoomSettings }> =>
    api.put(`/worship/rooms/${roomId}/settings`, settings),

  // ==================== ROOM TYPE SPECIFIC OPERATIONS ====================

  // Get template rooms (playlists that can be started)
  getTemplateRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/templates'),

  // Get live event rooms
  getLiveEventRooms: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/live-events'),

  // Get upcoming live events
  getUpcomingLiveEvents: (): Promise<{ data: WorshipRoom[] }> =>
    api.get('/worship/rooms/live-events/upcoming'),

  // Start a template room (creates a new live session from template)
  startTemplateRoom: (roomId: string): Promise<{ data: WorshipRoom }> =>
    api.post(`/worship/rooms/${roomId}/start-template`),

  // Start a live event
  startLiveEvent: (roomId: string): Promise<{ data: WorshipRoom }> =>
    api.post(`/worship/rooms/${roomId}/start-live-event`),

  // End a live event
  endLiveEvent: (roomId: string): Promise<{ data: { message: string } }> =>
    api.post(`/worship/rooms/${roomId}/end-live-event`),

  // ==================== PLAYLIST OPERATIONS ====================

  // Get public playlists
  getPublicPlaylists: (): Promise<{ data: WorshipPlaylist[] }> =>
    api.get('/worship/playlists'),

  // Get user's playlists
  getMyPlaylists: (): Promise<{ data: WorshipPlaylist[] }> =>
    api.get('/worship/playlists/my-playlists'),

  // Get popular playlists
  getPopularPlaylists: (limit: number = 10): Promise<{ data: WorshipPlaylist[] }> =>
    api.get(`/worship/playlists/popular?limit=${limit}`),

  // Search playlists
  searchPlaylists: (query: string): Promise<{ data: WorshipPlaylist[] }> =>
    api.get(`/worship/playlists/search?q=${encodeURIComponent(query)}`),

  // Get playlist by ID
  getPlaylist: (playlistId: string): Promise<{ data: WorshipPlaylist }> =>
    api.get(`/worship/playlists/${playlistId}`),

  // Create playlist
  createPlaylist: (playlistData: WorshipPlaylistRequest): Promise<{ data: WorshipPlaylist }> =>
    api.post('/worship/playlists', playlistData),

  // Update playlist
  updatePlaylist: (playlistId: string, playlistData: WorshipPlaylistRequest): Promise<{ data: WorshipPlaylist }> =>
    api.put(`/worship/playlists/${playlistId}`, playlistData),

  // Delete playlist
  deletePlaylist: (playlistId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/worship/playlists/${playlistId}`),

  // ==================== PLAYLIST ENTRY OPERATIONS ====================

  // Get playlist entries
  getPlaylistEntries: (playlistId: string): Promise<{ data: WorshipPlaylistEntry[] }> =>
    api.get(`/worship/playlists/${playlistId}/entries`),

  // Add entry to playlist
  addPlaylistEntry: (playlistId: string, entryData: WorshipPlaylistEntryRequest): Promise<{ data: WorshipPlaylistEntry }> =>
    api.post(`/worship/playlists/${playlistId}/entries`, entryData),

  // Remove entry from playlist
  removePlaylistEntry: (entryId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/worship/playlists/entries/${entryId}`),

  // Update entry position
  updateEntryPosition: (entryId: string, position: number): Promise<{ data: WorshipPlaylistEntry }> =>
    api.put(`/worship/playlists/entries/${entryId}/position?position=${position}`),

  // ==================== FILE UPLOAD OPERATIONS ====================

  // Get pre-signed URL for direct S3 upload (X.com/Twitter approach)
  getPresignedUploadUrl: async (fileName: string, contentType: string, fileSize: number): Promise<{
    presignedUrl: string;
    s3Key: string;
    finalUrl: string;
  }> => {
    const response = await api.post('/worship/presigned-upload', {
      fileName,
      contentType,
      fileSize,
    });
    return response.data;
  },

  // Confirm upload completion after direct S3 upload
  confirmUpload: async (s3Key: string, fileName: string, contentType: string, fileSize: number): Promise<{
    url: string;
    success: boolean;
  }> => {
    const response = await api.post('/worship/confirm-upload', {
      s3Key,
      fileName,
      contentType,
      fileSize,
    });
    return response.data;
  },

  // Upload room image using direct S3 upload (bypasses NGINX, like X.com does)
  uploadRoomImage: async (file: File): Promise<string> => {
    // Step 1: Get pre-signed URL from our backend
    const { presignedUrl, s3Key, finalUrl } = await worshipAPI.getPresignedUploadUrl(
      file.name,
      file.type,
      file.size
    );

    // Step 2: Upload directly to S3 using the pre-signed URL
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    // Step 3: Confirm upload completion with our backend
    await worshipAPI.confirmUpload(s3Key, file.name, file.type, file.size);

    // Return the final accessible URL
    return finalUrl;
  },

  // Legacy upload method (through server - kept for backwards compatibility)
  uploadRoomImageLegacy: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/worship/upload-room-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default worshipAPI;
