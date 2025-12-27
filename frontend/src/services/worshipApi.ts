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
  WorshipPlaylistEntryRequest
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

  // Upload room image
  uploadRoomImage: async (file: File): Promise<string> => {
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
