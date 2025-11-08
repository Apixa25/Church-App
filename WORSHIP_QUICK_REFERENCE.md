# Worship Feature - Quick Reference

## URLs
- **Room List**: `/worship`
- **Specific Room**: `/worship/{roomId}`

## Quick Actions Button
- **Icon**: 🎵 music
- **Title**: Worship Rooms
- **Description**: Join live worship sessions and share music with the community
- **Button Text**: Join Worship

## WebSocket Subscriptions

### Subscribe
```typescript
// Room updates
websocketService.subscribeToWorshipRoom(roomId, callback)

// Queue updates
websocketService.subscribeToWorshipQueue(roomId, callback)

// Now playing
websocketService.subscribeToNowPlaying(roomId, callback)

// Playback commands
websocketService.subscribeToPlaybackCommands(roomId, callback)

// Waitlist
websocketService.subscribeToWorshipWaitlist(roomId, callback)

// Sync data
websocketService.subscribeToWorshipSync(callback)
```

### Send
```typescript
// Playback control
websocketService.sendPlaybackCommand(roomId, command)

// Heartbeat (every 30s)
websocketService.sendWorshipHeartbeat(roomId)

// Request sync
websocketService.requestWorshipSync(roomId)

// Presence
websocketService.sendWorshipPresence(roomId, 'online' | 'offline')
```

## REST API

### Rooms
```typescript
worshipAPI.getRooms()
worshipAPI.getPublicRooms()
worshipAPI.getUserRooms()
worshipAPI.getCurrentlyPlayingRooms()
worshipAPI.getRoomById(roomId)
worshipAPI.createRoom(roomData)
worshipAPI.updateRoom(roomId, roomData)
worshipAPI.deleteRoom(roomId)
```

### Participation
```typescript
worshipAPI.joinRoom(roomId)
worshipAPI.leaveRoom(roomId)
worshipAPI.getParticipants(roomId)
worshipAPI.joinWaitlist(roomId)
worshipAPI.leaveWaitlist(roomId)
worshipAPI.getWaitlist(roomId)
```

### Queue
```typescript
worshipAPI.getQueue(roomId)
worshipAPI.getCurrentlyPlaying(roomId)
worshipAPI.addToQueue(roomId, songData)
worshipAPI.removeFromQueue(queueEntryId)
```

### Playback
```typescript
worshipAPI.vote(voteData)
worshipAPI.playNext(roomId)
worshipAPI.skip(roomId)
```

## Permissions

| Action | LISTENER | DJ | LEADER | MODERATOR |
|--------|----------|----|----|-----------|
| View Room | ✅ | ✅ | ✅ | ✅ |
| Join Room | ✅ | ✅ | ✅ | ✅ |
| Add to Queue | ❌ | ✅ | ✅ | ✅ |
| Vote (Upvote/Skip) | ✅ | ✅ | ✅ | ✅ |
| Remove from Queue | ❌ | Own songs | ✅ | ✅ |
| Play/Pause/Seek | ❌ | ❌ | ✅ | ✅ |
| Play Next | ❌ | ❌ | ✅ | ✅ |
| Skip Current | ❌ | ❌ | ✅ | ✅ |
| Edit Room | ❌ | ❌ | Creator | Creator |
| Delete Room | ❌ | ❌ | Creator | Creator |

## Helper Functions

```typescript
// Extract YouTube video ID from URL
extractYouTubeVideoId(url: string): string | null

// Check if user can control playback
canControlPlayback(role: ParticipantRole): boolean

// Check if user can add to queue
canAddToQueue(role: ParticipantRole): boolean

// Check if user can vote
canVote(role: ParticipantRole): boolean

// Check if user can moderate
canModerate(role: ParticipantRole): boolean
```

## Playback Actions

```typescript
enum PlaybackAction {
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  STOP = 'STOP',
  SEEK = 'SEEK',
  SKIP = 'SKIP'
}
```

## Vote Types

```typescript
enum VoteType {
  UPVOTE = 'UPVOTE',
  SKIP = 'SKIP'
}
```

## Room Status

```typescript
enum PlaybackStatus {
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}
```

## Queue Status

```typescript
enum QueueStatus {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}
```

## Default Settings

```typescript
{
  allowDuplicateSongs: false,
  songCooldownHours: 24,
  minSongDuration: 30, // seconds
  maxSongDuration: 600, // seconds (10 min)
  maxQueueSize: 50,
  maxSongsPerUser: 5,
  allowExplicitContent: false,
  requireApproval: false,
  enableWaitlist: true,
  autoSkipThreshold: 0.5, // 50%
  enableSongRequests: true
}
```

## Sync State Format

```typescript
{
  action: PlaybackAction,
  videoId: string,
  videoTitle?: string,
  seekPosition?: number,
  scheduledPlayTime?: number, // timestamp + 2000ms buffer
  timestamp: number
}
```

## Common Patterns

### Initialize Room
```typescript
useEffect(() => {
  loadRoomData();
  setupWebSocketSubscriptions();

  const heartbeat = setInterval(() => {
    websocketService.sendWorshipHeartbeat(roomId);
  }, 30000);

  websocketService.sendWorshipPresence(roomId, 'online');

  return () => {
    clearInterval(heartbeat);
    websocketService.sendWorshipPresence(roomId, 'offline');
  };
}, [roomId]);
```

### Handle Playback Command
```typescript
useEffect(() => {
  if (!syncState || !isReady) return;

  const delay = syncState.scheduledPlayTime
    ? syncState.scheduledPlayTime - Date.now()
    : 0;

  if (delay > 0) {
    setTimeout(() => executeSync(), delay);
  } else {
    executeSync();
  }
}, [syncState, isReady]);
```

### Add Song to Queue
```typescript
const videoId = extractYouTubeVideoId(url);
await worshipAPI.addToQueue(roomId, {
  videoId,
  videoTitle: 'Song Title',
  videoThumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
  videoDuration: null
});
```

### Vote on Song
```typescript
await worshipAPI.vote({
  queueEntryId: song.id,
  voteType: VoteType.UPVOTE // or VoteType.SKIP
});
```

## CSS Variables Used

```css
--bg-primary
--bg-secondary
--bg-tertiary
--bg-elevated
--bg-overlay
--text-primary
--text-secondary
--border-primary
--border-glow
--accent-primary
--accent-primary-dark
--accent-secondary-dark
--gradient-primary
--button-primary-glow
--glow-blue
--shadow-sm
--shadow-md
--shadow-xl
--border-radius-sm
--border-radius-md
--border-radius-lg
--border-radius-pill
--transition-base
```

## Debugging Tips

### Check WebSocket Connection
```typescript
// In browser console
websocketService.client.connected // should be true
```

### Monitor Messages
```typescript
// All subscriptions log to console
// Check browser DevTools > Console for:
// - "Room update:", update
// - "Queue update:", update
// - "Now playing update:", update
// - "Playback command:", command
```

### Test Sync State
```typescript
// Request sync manually
websocketService.requestWorshipSync(roomId)
// Watch for SYNC_STATE message in subscribeToWorshipSync callback
```

### Verify Permissions
```typescript
// Check user role
console.log('User role:', userRole)
console.log('Can control:', canControlPlayback(userRole))
console.log('Can add:', canAddToQueue(userRole))
console.log('Can vote:', canVote(userRole))
```
