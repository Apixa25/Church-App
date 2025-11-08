# Worship Rooms Feature - Implementation Guide

## Overview
A plug.dj-style worship leader feature that allows users to create and join live worship rooms, share YouTube music, vote on songs, and enjoy synchronized playback together.

## Architecture

### Backend (Spring Boot)
- **Entities**: 6 JPA entities with UUID primary keys
- **Repositories**: 6 repositories with custom query methods
- **Services**: 3 service classes with permission validation
- **Controllers**: 2 controllers (REST + WebSocket)
- **Database**: PostgreSQL with soft deletes and timestamps

### Frontend (React + TypeScript)
- **Components**: 4 main components with CSS
- **Services**: API wrapper + WebSocket integration
- **Types**: Comprehensive TypeScript interfaces
- **Routing**: Protected routes with authentication

## Key Features

### 1. Real-Time Synchronized Playback
- YouTube IFrame API integration
- 2-second buffer for network latency
- Scheduled play time for synchronization
- Client-side playback (no server streaming)
- Automatic state sync for reconnecting clients

### 2. Democratic Voting System
- Upvote songs to show appreciation
- Vote to skip current song
- Configurable skip threshold (default 50%)
- Automatic skip when threshold reached
- Vote toggle (vote again to remove)

### 3. Queue Management
- Position-based ordering with gaps (10000, 20000, 30000)
- Easy drag-to-reorder capability (future enhancement)
- Song validation (duplicates, cooldown, duration)
- Play history tracking
- Queue search for large queues

### 4. Room Management
- Public and private rooms
- Configurable max participants
- Waitlist system for capacity management
- Image upload for room thumbnails
- Room settings (skip threshold, participant limits)

### 5. Permission System
- **LISTENER**: Basic permissions, can vote
- **DJ**: Can add songs and vote
- **LEADER**: Full playback control
- **MODERATOR**: Can remove songs and control playback
- **ADMIN**: Full administrative access

### 6. Song Validation
- Duplicate prevention (configurable)
- Cooldown period between plays
- Duration limits (min/max)
- Banned video list
- YouTube URL validation

## API Endpoints

### REST Endpoints (WorshipController)
```
GET    /worship/rooms                     - Get all rooms
GET    /worship/rooms/public              - Get public rooms
GET    /worship/rooms/my-rooms            - Get user's rooms
GET    /worship/rooms/playing             - Get currently playing rooms
GET    /worship/rooms/{id}                - Get room details
POST   /worship/rooms                     - Create room
PUT    /worship/rooms/{id}                - Update room
DELETE /worship/rooms/{id}                - Delete room

POST   /worship/rooms/{id}/join           - Join room
POST   /worship/rooms/{id}/leave          - Leave room
GET    /worship/rooms/{id}/participants   - Get participants

POST   /worship/rooms/{id}/waitlist/join  - Join waitlist
POST   /worship/rooms/{id}/waitlist/leave - Leave waitlist
GET    /worship/rooms/{id}/waitlist       - Get waitlist

GET    /worship/rooms/{id}/queue          - Get queue
GET    /worship/rooms/{id}/queue/now-playing - Get current song
POST   /worship/rooms/{id}/queue          - Add to queue
DELETE /worship/queue/{id}                - Remove from queue

POST   /worship/vote                      - Vote on song
POST   /worship/rooms/{id}/play-next      - Play next song
POST   /worship/rooms/{id}/skip           - Skip current song
```

### WebSocket Endpoints (STOMP)
```
SUBSCRIBE /topic/worship/rooms/{id}           - Room updates
SUBSCRIBE /topic/worship/rooms/{id}/queue     - Queue updates
SUBSCRIBE /topic/worship/rooms/{id}/nowPlaying - Now playing updates
SUBSCRIBE /topic/worship/rooms/{id}/playback  - Playback commands
SUBSCRIBE /topic/worship/rooms/{id}/waitlist  - Waitlist updates
SUBSCRIBE /user/queue/worship/sync            - State sync

SEND /app/worship/rooms/{id}/control    - Playback control
SEND /app/worship/rooms/{id}/heartbeat  - Activity heartbeat
SEND /app/worship/rooms/{id}/sync       - Request sync
SEND /app/worship/rooms/{id}/presence   - Presence update
```

## Database Schema

### worship_rooms
- id (UUID, PK)
- name (VARCHAR 100)
- description (TEXT)
- image_url (VARCHAR 500)
- created_by (UUID, FK to users)
- current_leader (UUID, FK to users)
- is_private (BOOLEAN)
- max_participants (INTEGER)
- skip_threshold (DOUBLE)
- playback_status (VARCHAR 20) - 'playing', 'paused', 'stopped'
- playback_position (DOUBLE)
- current_video_id (VARCHAR 50)
- current_video_title (VARCHAR 200)
- current_video_thumbnail (VARCHAR 500)
- playback_started_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### worship_queue_entries
- id (UUID, PK)
- worship_room_id (UUID, FK)
- user_id (UUID, FK)
- video_id (VARCHAR 50)
- video_title (VARCHAR 200)
- video_duration (INTEGER) - seconds
- video_thumbnail_url (VARCHAR 500)
- position (INTEGER) - 10000, 20000, 30000, etc.
- status (VARCHAR 20) - 'WAITING', 'PLAYING', 'COMPLETED', 'SKIPPED'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### worship_room_participants
- id (UUID, PK)
- worship_room_id (UUID, FK)
- user_id (UUID, FK)
- role (VARCHAR 20) - 'LISTENER', 'DJ', 'LEADER', 'MODERATOR'
- is_in_waitlist (BOOLEAN)
- waitlist_position (INTEGER)
- last_active_at (TIMESTAMP)
- joined_at (TIMESTAMP)
- left_at (TIMESTAMP)
- is_active (BOOLEAN)

### worship_song_votes
- id (UUID, PK)
- queue_entry_id (UUID, FK)
- user_id (UUID, FK)
- vote_type (VARCHAR 10) - 'UPVOTE', 'SKIP'
- created_at (TIMESTAMP)
- UNIQUE(queue_entry_id, user_id, vote_type)

### worship_play_history
- id (UUID, PK)
- worship_room_id (UUID, FK)
- leader_id (UUID, FK)
- video_id (VARCHAR 50)
- video_title (VARCHAR 200)
- video_duration (INTEGER)
- video_thumbnail_url (VARCHAR 500)
- was_skipped (BOOLEAN)
- upvote_count (INTEGER)
- skip_vote_count (INTEGER)
- participant_count (INTEGER)
- played_at (TIMESTAMP)

### worship_room_settings
- id (UUID, PK)
- worship_room_id (UUID, FK, UNIQUE)
- allow_duplicate_songs (BOOLEAN)
- song_cooldown_hours (INTEGER)
- min_song_duration (INTEGER)
- max_song_duration (INTEGER)
- max_queue_size (INTEGER)
- max_songs_per_user (INTEGER)
- allow_explicit_content (BOOLEAN)
- require_approval (BOOLEAN)
- enable_waitlist (BOOLEAN)
- auto_skip_threshold (DOUBLE)
- enable_song_requests (BOOLEAN)
- banned_video_ids (TEXT) - JSON array
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Frontend Components

### WorshipRoomList
Browse, search, and create worship rooms.
- **Views**: Now Playing, My Rooms, Public Rooms
- **Features**: Real-time room updates, create room modal, join buttons
- **File**: `frontend/src/components/WorshipRoomList.tsx`

### WorshipRoom
Main room interface with player, queue, and participants.
- **Features**: Room header, participant panel, playback controls
- **Permissions**: Role-based UI elements
- **File**: `frontend/src/components/WorshipRoom.tsx`

### WorshipPlayer
YouTube player with synchronized playback.
- **Features**: Custom controls, volume control, progress bar, sync state
- **Integration**: YouTube IFrame API
- **File**: `frontend/src/components/WorshipPlayer.tsx`

### WorshipQueue
Queue management with voting UI.
- **Features**: Add songs, vote (upvote/skip), remove songs, search queue
- **Permissions**: Role-based actions
- **File**: `frontend/src/components/WorshipQueue.tsx`

## Usage Flow

### Creating a Room
1. Navigate to `/worship`
2. Click "Create Room"
3. Fill in room details:
   - Name (required)
   - Description
   - Image URL
   - Max participants
   - Skip threshold (0.0 - 1.0)
   - Private/Public toggle
4. Click "Create Room"
5. Automatically navigate to new room

### Joining a Room
1. Navigate to `/worship`
2. Browse rooms (Now Playing, Public Rooms, etc.)
3. Click "Join Room" on desired room
4. If room is full, option to join waitlist

### Adding Songs
1. In room, click "Add Song"
2. Paste YouTube URL
3. Click "Add to Queue"
4. Song appears in queue with position number

### Voting
- **Upvote**: Click thumbs up on any queued song
- **Skip**: Click skip on currently playing song
- **Auto-skip**: When skip votes reach threshold, song skips automatically

### Playback Control (Leaders/Moderators)
- **Play Next**: Advance to next song in queue
- **Skip**: Skip current song
- **Pause/Resume**: Control playback (via player controls)
- **Seek**: Jump to specific time in video

## Configuration

### Default Settings
```java
// WorshipRoomSettings.java
- allowDuplicateSongs: false
- songCooldownHours: 24
- minSongDuration: 30 seconds
- maxSongDuration: 10 minutes
- maxQueueSize: 50
- maxSongsPerUser: 5
- allowExplicitContent: false
- requireApproval: false
- enableWaitlist: true
- autoSkipThreshold: 0.5 (50%)
- enableSongRequests: true
```

### Room Settings
```java
// WorshipRoom.java
- maxParticipants: 50 (default)
- skipThreshold: 0.5 (50%)
- isPrivate: false
```

## WebSocket Message Types

### Room Updates
```typescript
{ type: 'ROOM_UPDATED', room: WorshipRoom }
{ type: 'USER_JOINED', participant: WorshipRoomParticipant }
{ type: 'USER_LEFT', userId: string }
{ type: 'PARTICIPANT_ACTIVE', username: string, timestamp: LocalDateTime }
{ type: 'USER_PRESENCE', username: string, status: 'online' | 'offline' }
```

### Queue Updates
```typescript
{ type: 'SONG_ADDED', queueEntry: WorshipQueueEntry }
{ type: 'SONG_REMOVED', queueEntryId: string }
{ type: 'VOTE_UPDATED', queueEntry: WorshipQueueEntry }
```

### Playback Updates
```typescript
{ type: 'NOW_PLAYING', queueEntry: WorshipQueueEntry, scheduledPlayTime: number }
{ type: 'PLAYBACK_STOPPED' }
{ type: 'SONG_SKIPPED', reason: string }
{ type: 'PLAYBACK_COMMAND', action: string, videoId: string, seekPosition?: number, scheduledPlayTime: number }
```

### Sync Updates
```typescript
{
  type: 'SYNC_STATE',
  playbackStatus: string,
  playbackPosition: number,
  currentVideoId: string,
  currentVideoTitle: string,
  currentVideoThumbnail: string,
  playbackStartedAt: LocalDateTime,
  timestamp: number
}
```

## Testing Checklist

### Backend Tests
- [ ] Create room
- [ ] Join room
- [ ] Leave room
- [ ] Add song to queue
- [ ] Vote on song (upvote/skip)
- [ ] Remove song from queue
- [ ] Play next song
- [ ] Skip current song
- [ ] Room permissions
- [ ] Waitlist functionality
- [ ] WebSocket connections
- [ ] Heartbeat system

### Frontend Tests
- [ ] Browse rooms
- [ ] Create room modal
- [ ] Join room
- [ ] Display queue
- [ ] Add song form
- [ ] Vote buttons
- [ ] Player controls
- [ ] Sync state
- [ ] Reconnection handling
- [ ] Real-time updates
- [ ] Responsive design
- [ ] Dark theme consistency

### Integration Tests
- [ ] Multiple users in same room
- [ ] Synchronized playback
- [ ] Vote threshold auto-skip
- [ ] Queue advancement
- [ ] WebSocket message flow
- [ ] Heartbeat timeout
- [ ] Reconnection sync

## Future Enhancements

### Phase 9 (Optional)
- YouTube Data API integration for video metadata
- Search YouTube directly in app
- Video duration fetching
- Thumbnail optimization

### Phase 10 (Polish)
- Chat functionality in rooms
- Room settings UI
- Drag-to-reorder queue
- Mobile optimization
- Performance testing with 50+ users
- Error boundary components
- Toast notifications
- Loading states optimization

### Additional Features
- Playlists
- Favorites/Bookmarks
- User statistics (songs added, votes given)
- Room analytics (most played songs, peak times)
- DJ rotation timer
- Song recommendations
- Genre/mood filters
- Collaborative playlists
- Live lyrics display
- Audio visualizations

## Troubleshooting

### YouTube Player Not Loading
- Ensure YouTube IFrame API script is loaded
- Check browser console for CORS errors
- Verify video ID is valid
- Check if video is embeddable

### WebSocket Connection Issues
- Verify WebSocket configuration in backend
- Check STOMP endpoints
- Ensure authentication token is valid
- Check browser WebSocket support

### Sync Issues
- Verify scheduledPlayTime calculation
- Check client clocks are synchronized
- Monitor network latency
- Adjust 2-second buffer if needed

### Permission Errors
- Check user role in room
- Verify participant status
- Check if user is room creator/leader
- Review permission service logic

## Developer Notes

### Code Organization
```
backend/src/main/java/com/churchapp/
├── entity/
│   ├── WorshipRoom.java
│   ├── WorshipQueueEntry.java
│   ├── WorshipRoomParticipant.java
│   ├── WorshipSongVote.java
│   ├── WorshipPlayHistory.java
│   └── WorshipRoomSettings.java
├── repository/
│   └── [6 repository interfaces]
├── dto/
│   └── [8 DTO classes]
├── service/
│   ├── WorshipPermissionService.java
│   ├── WorshipRoomService.java
│   └── WorshipQueueService.java
└── controller/
    ├── WorshipController.java
    └── WebSocketWorshipController.java

frontend/src/
├── components/
│   ├── WorshipRoomList.tsx/css
│   ├── WorshipRoom.tsx/css
│   ├── WorshipPlayer.tsx/css
│   └── WorshipQueue.tsx/css
├── services/
│   ├── worshipApi.ts
│   └── websocketService.ts (extended)
└── types/
    └── Worship.ts
```

### Key Patterns
- **Position Gaps**: Queue positions use gaps (10000, 20000) for easy reordering
- **Scheduled Playback**: 2-second buffer for synchronized play
- **Soft Deletes**: Entities use `isActive` flag instead of hard deletes
- **UUID Keys**: All primary keys are UUIDs for distributed systems
- **Role-Based Permissions**: Centralized permission service
- **Real-Time Updates**: WebSocket subscriptions for live data
- **Optimistic UI**: Client updates immediately, server confirms

## Support
For issues or questions, please refer to the main Church App documentation or contact the development team.

---
**Built with**: Spring Boot, React, TypeScript, PostgreSQL, WebSocket (STOMP), YouTube IFrame API
**Version**: 1.0.0
**Last Updated**: 2025-01-07
