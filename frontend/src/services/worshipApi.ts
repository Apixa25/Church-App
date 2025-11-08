import api from './api';
import {
  WorshipRoom,
  WorshipRoomRequest,
  WorshipQueueEntry,
  WorshipQueueEntryRequest,
  WorshipRoomParticipant,
  WorshipVoteRequest,
  WorshipRoomSettings
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
};

export default worshipAPI;
