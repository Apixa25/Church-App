# Worship Feature - Testing Checklist

## Pre-Testing Setup

### Backend Setup
- [ ] Run `mvn clean install` (or `./mvnw clean install`)
- [ ] Verify PostgreSQL is running
- [ ] Check database migrations created all worship tables
- [ ] Start Spring Boot application
- [ ] Verify no compilation errors
- [ ] Check logs for successful WebSocket configuration

### Frontend Setup
- [ ] Run `npm install` to ensure all dependencies
- [ ] Run `npm start` for development server
- [ ] Verify no TypeScript compilation errors
- [ ] Check browser console for errors
- [ ] Verify WebSocket connection established

---

## Functional Testing

### 1. Dashboard Integration
- [ ] Navigate to `/dashboard`
- [ ] Verify "Worship Rooms" quick action appears
- [ ] Quick action has 🎵 music icon
- [ ] Click quick action navigates to `/worship`

### 2. Room List (WorshipRoomList)
- [ ] Page loads without errors
- [ ] "Back Home" button works
- [ ] Three tab buttons visible: "Now Playing", "My Rooms", "Public Rooms"
- [ ] "Create Room" button visible
- [ ] Initially shows empty state (no rooms yet)

### 3. Create Room
- [ ] Click "Create Room" button
- [ ] Modal appears with form
- [ ] Fill in all fields:
  - Name: "Sunday Worship"
  - Description: "Join us for worship"
  - Image URL: Any valid image URL (optional)
  - Max Participants: 50
  - Skip Threshold: 0.5
  - Private checkbox: unchecked
- [ ] Click "Create Room"
- [ ] Navigates to new room at `/worship/{roomId}`
- [ ] Room appears in room list

### 4. Room Interface (WorshipRoom)
- [ ] Room header shows correct name
- [ ] "Back" button navigates to room list
- [ ] Participant count shows "1"
- [ ] "Leave" button visible
- [ ] Player shows placeholder (no song playing)
- [ ] Queue section visible
- [ ] "Add Song" button visible

### 5. Add Song to Queue
- [ ] Click "Add Song" button
- [ ] Form expands
- [ ] Paste YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- [ ] Click "Add to Queue"
- [ ] Song appears in queue with:
  - Position number "1"
  - Thumbnail image
  - Song title
  - Added by username
  - Vote buttons (👍 and ⏭️)

### 6. Queue Management
- [ ] Add 2-3 more songs
- [ ] Queue shows all songs in order
- [ ] Each song has position number
- [ ] Vote buttons visible on each song
- [ ] Click upvote button - count increases
- [ ] Click upvote again - count decreases (toggle)

### 7. Playback Control (Leader/Moderator)
- [ ] Click "Play Next" button
- [ ] First song starts playing in player
- [ ] YouTube video loads and plays
- [ ] Current song info displays above queue:
  - Song title
  - Added by username
  - Vote counts
- [ ] Player controls work:
  - Play/Pause button
  - Volume slider
  - Seek bar (if leader/moderator)

### 8. Voting on Current Song
- [ ] Vote buttons on current song change to skip-only
- [ ] Click skip button
- [ ] Skip vote count increases
- [ ] If threshold reached, song skips automatically

### 9. Manual Skip
- [ ] Click "Skip" button (leaders/moderators only)
- [ ] Current song marks as skipped
- [ ] Next song in queue starts playing
- [ ] Queue updates in real-time

### 10. Multi-User Testing
**Open in two different browsers/incognito windows:**

**User 1:**
- [ ] Create room "Test Room"
- [ ] Add song to queue
- [ ] Click "Play Next"
- [ ] Song plays

**User 2:**
- [ ] Navigate to `/worship`
- [ ] See "Test Room" in public rooms
- [ ] Click "Join Room"
- [ ] Room shows participant count = 2
- [ ] See same song playing
- [ ] Player synchronized with User 1
- [ ] Add different song to queue

**Both Users:**
- [ ] Both see queue update when either adds song
- [ ] Both see vote counts update in real-time
- [ ] Both experience synchronized playback (within 2 seconds)

### 11. Voting System
**User 1 (Leader):**
- [ ] Song playing

**User 2:**
- [ ] Click skip vote
- [ ] Skip count shows 1

**Add more users until skip threshold reached:**
- [ ] Song auto-skips when 50% vote skip
- [ ] Next song starts playing for all users

### 12. Permissions Testing
**Create 2nd user with different role:**
- [ ] LISTENER can vote, cannot add songs
- [ ] DJ can add songs and vote
- [ ] LEADER can control playback
- [ ] MODERATOR can remove songs

### 13. Waitlist (if room is full)
- [ ] Set max participants to 2
- [ ] Have 2 users join
- [ ] 3rd user sees "Join Waitlist" option
- [ ] Waitlist counter updates

### 14. Leave Room
- [ ] Click "Leave" button
- [ ] Navigates back to room list
- [ ] Participant count decreases
- [ ] If leader leaves, playback stops

---

## WebSocket Testing

### 1. Connection
- [ ] Open browser DevTools > Console
- [ ] Check for WebSocket connection message
- [ ] Verify `websocketService.client.connected === true`

### 2. Real-Time Updates
**In separate browser windows:**
- [ ] User 1 adds song → User 2 sees it instantly
- [ ] User 1 votes → User 2 sees vote count update
- [ ] User 1 removes song → User 2 sees it disappear
- [ ] Room updates propagate to all connected users

### 3. Heartbeat
- [ ] Stay in room for 30+ seconds
- [ ] Check console for heartbeat messages every 30s
- [ ] Verify participant stays "active"

### 4. Reconnection
- [ ] Disconnect internet briefly
- [ ] Reconnect
- [ ] Sync request sent automatically
- [ ] Room state restored correctly
- [ ] Playback position synchronized

---

## UI/UX Testing

### 1. Responsive Design
**Desktop (1200px+):**
- [ ] Full layout with participant sidebar
- [ ] All controls visible and accessible
- [ ] Proper spacing and alignment

**Tablet (768px-1199px):**
- [ ] Adjusted column widths
- [ ] Readable text sizes
- [ ] Touch-friendly buttons

**Mobile (<768px):**
- [ ] Stacked layout
- [ ] Full-width components
- [ ] Collapsible panels
- [ ] Large touch targets

### 2. Dark Theme
- [ ] Background colors match existing app
- [ ] Text readable on dark background
- [ ] Hover states visible
- [ ] Focus states accessible
- [ ] Gradients consistent with design system

### 3. Loading States
- [ ] Room list shows loading spinner
- [ ] Room shows loading spinner
- [ ] "Adding..." shows when adding song
- [ ] Smooth transitions

### 4. Error Handling
- [ ] Invalid YouTube URL shows error
- [ ] Duplicate song shows error message
- [ ] Permission errors show friendly message
- [ ] Network errors handled gracefully

---

## Edge Cases

### 1. Empty States
- [ ] Empty room list shows helpful message
- [ ] Empty queue shows "Add songs to get started"
- [ ] No song playing shows placeholder

### 2. Boundary Conditions
- [ ] Queue with 50+ songs handles well
- [ ] Room with max participants enforced
- [ ] Vote counts don't go negative
- [ ] Skip threshold calculation correct

### 3. Concurrent Operations
- [ ] Multiple users adding songs simultaneously
- [ ] Multiple users voting at same time
- [ ] Race conditions handled properly

### 4. Session Management
- [ ] Refresh page maintains room state
- [ ] Close tab and reopen rejoins room
- [ ] Logout leaves all rooms

---

## Performance Testing

### 1. Load Testing
- [ ] 10 users in same room
- [ ] 25 users in same room
- [ ] 50 users in same room (max)
- [ ] No lag or stuttering

### 2. Network Conditions
- [ ] Test on slow 3G connection
- [ ] Test with high latency
- [ ] Sync buffer (2 seconds) adequate
- [ ] Heartbeat doesn't miss

### 3. Memory Usage
- [ ] No memory leaks after extended use
- [ ] WebSocket connections cleaned up
- [ ] Component unmounting works correctly

---

## Accessibility Testing

### 1. Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activates buttons
- [ ] Arrow keys navigate lists
- [ ] Escape closes modals

### 2. Screen Reader
- [ ] All buttons have labels
- [ ] Form inputs have labels
- [ ] ARIA attributes present
- [ ] Announcements for dynamic content

### 3. Focus Management
- [ ] Focus indicators visible
- [ ] Focus trapped in modals
- [ ] Focus restored on modal close

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Firefox Mobile
- [ ] Samsung Internet

---

## Security Testing

### 1. Authentication
- [ ] Unauthenticated users redirected to login
- [ ] JWT token validated on each request
- [ ] Token expiration handled

### 2. Authorization
- [ ] Users can't access private rooms they're not in
- [ ] Role permissions enforced server-side
- [ ] Can't remove others' songs without permission

### 3. Input Validation
- [ ] XSS prevention (script tags sanitized)
- [ ] SQL injection protection
- [ ] YouTube URL validation
- [ ] Max length enforcement

---

## Data Persistence

### 1. Database
- [ ] Rooms persist across server restart
- [ ] Queue entries saved correctly
- [ ] Vote counts accurate
- [ ] Play history recorded

### 2. Data Integrity
- [ ] No orphaned queue entries
- [ ] Participant cleanup on leave
- [ ] Soft deletes working
- [ ] Timestamps accurate

---

## Known Issues to Watch For

### Potential Issues
- [ ] YouTube IFrame API loading timeout
- [ ] WebSocket disconnection on mobile sleep
- [ ] Time drift on client clocks (affects sync)
- [ ] CORS issues if frontend/backend on different domains
- [ ] Rate limiting on YouTube API (if implemented)

### Workarounds
- Add retry logic for YouTube API
- Implement reconnection with exponential backoff
- Use server time for sync calculations
- Configure CORS properly in Spring Boot
- Cache YouTube metadata

---

## Sign-Off Checklist

### Backend
- [ ] All endpoints tested
- [ ] WebSocket handlers working
- [ ] Database queries optimized
- [ ] Error handling implemented
- [ ] Logging in place

### Frontend
- [ ] All components render correctly
- [ ] WebSocket integration working
- [ ] State management correct
- [ ] Error boundaries present
- [ ] TypeScript types accurate

### Integration
- [ ] Routes configured
- [ ] Dashboard integration working
- [ ] Quick action functional
- [ ] End-to-end flow tested

### Documentation
- [ ] Feature guide complete
- [ ] Quick reference available
- [ ] Testing checklist reviewed
- [ ] Known issues documented

---

## Final Verification

- [ ] Feature deployed to staging environment
- [ ] QA team notified
- [ ] Product owner demo scheduled
- [ ] User acceptance testing planned
- [ ] Rollback plan in place

---

## Success Criteria

✅ Users can create and join worship rooms
✅ YouTube videos play synchronized across all users
✅ Democratic voting system works correctly
✅ Real-time updates function properly
✅ Mobile responsive design works
✅ No critical bugs or errors
✅ Performance meets requirements (50+ users)
✅ Security measures in place

---

**Testing Status**: ⏳ Pending
**Tested By**: _____________
**Date**: _____________
**Version**: 1.0.0

🎵 **Ready to worship together!** 🎵
