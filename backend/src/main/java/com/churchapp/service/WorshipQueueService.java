package com.churchapp.service;

import com.churchapp.dto.*;
import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WorshipQueueService {

    private final WorshipQueueRepository queueRepository;
    private final WorshipSongVoteRepository voteRepository;
    private final WorshipRoomRepository roomRepository;
    private final WorshipRoomParticipantRepository participantRepository;
    private final WorshipPlayHistoryRepository historyRepository;
    private final WorshipRoomSettingsRepository settingsRepository;
    private final UserRepository userRepository;
    private final WorshipPermissionService permissionService;
    private final SimpMessagingTemplate messagingTemplate;

    private static final int POSITION_GAP = 10000; // Gap between queue positions for easy reordering

    // ==================== QUEUE OPERATIONS ====================

    @Transactional
    public WorshipQueueEntryResponse addToQueue(String userEmail, WorshipQueueEntryRequest request) {
        try {
            User user = getUserByEmail(userEmail);
            WorshipRoom room = getRoomByIdOrThrow(request.getRoomId());

            // Validate permissions
            if (!permissionService.canAddToQueue(user, room)) {
                throw new RuntimeException("Insufficient permissions to add songs to queue");
            }

            // Get room settings
            WorshipRoomSettings settings = getSettingsForRoom(room);

            // Validate queue size
            long currentQueueSize = queueRepository.countByWorshipRoomAndUserAndStatus(
                room, user, WorshipQueueEntry.QueueStatus.WAITING
            );

            if (settings.isQueueFull((int) currentQueueSize)) {
                throw new RuntimeException("Queue is full");
            }

            if (!settings.canUserAddMoreSongs((int) currentQueueSize)) {
                throw new RuntimeException("You have reached the maximum number of songs in queue");
            }

            // Validate song duration
            if (request.getVideoDuration() != null &&
                !settings.isSongDurationValid(request.getVideoDuration())) {
                throw new RuntimeException("Song duration is not within allowed range");
            }

            // Check for duplicates if not allowed
            if (!settings.getAllowDuplicateSongs() &&
                queueRepository.isVideoInQueue(room, request.getVideoId())) {
                throw new RuntimeException("This song is already in the queue");
            }

            // Check cooldown
            if (settings.getSongCooldownHours() != null && settings.getSongCooldownHours() > 0) {
                LocalDateTime cooldownTime = LocalDateTime.now().minusHours(settings.getSongCooldownHours());
                if (queueRepository.wasVideoRecentlyPlayed(room, request.getVideoId(), cooldownTime)) {
                    throw new RuntimeException("This song was recently played. Please wait before adding it again");
                }
            }

            // Check if video is banned
            if (!settings.isVideoAllowed(request.getVideoId())) {
                throw new RuntimeException("This video is not allowed in this room");
            }

            // Get next position
            Integer maxPosition = queueRepository.getMaxPosition(room);
            int nextPosition = (maxPosition == null ? 0 : maxPosition) + POSITION_GAP;

            // Create queue entry
            WorshipQueueEntry entry = new WorshipQueueEntry();
            entry.setWorshipRoom(room);
            entry.setUser(user);
            entry.setVideoId(request.getVideoId());
            entry.setVideoTitle(request.getVideoTitle());
            entry.setVideoDuration(request.getVideoDuration());
            entry.setVideoThumbnailUrl(request.getVideoThumbnailUrl());
            entry.setPosition(nextPosition);
            entry.setStatus(WorshipQueueEntry.QueueStatus.WAITING);

            entry = queueRepository.save(entry);

            // Broadcast queue update
            broadcastQueueUpdate(room.getId(), "SONG_ADDED", entry);

            return buildQueueEntryResponse(entry, user);
        } catch (Exception ex) {
            log.error("Failed to add song to queue for user {} in room {}. Reason: {}", userEmail,
                request != null ? request.getRoomId() : null, ex.getMessage(), ex);
            String rootMessage = ex.getClass().getSimpleName() +
                (ex.getMessage() != null ? (": " + ex.getMessage()) : "");
            throw new RuntimeException("Unable to add song to queue - " + rootMessage);
        }
    }

    @Transactional
    public void removeFromQueue(String userEmail, UUID queueEntryId) {
        User user = getUserByEmail(userEmail);
        WorshipQueueEntry entry = getQueueEntryByIdOrThrow(queueEntryId);
        WorshipRoom room = entry.getWorshipRoom();

        // Validate permissions
        if (!entry.canBeDeletedBy(user)) {
            throw new RuntimeException("Insufficient permissions to remove this song");
        }

        if (entry.getStatus() == WorshipQueueEntry.QueueStatus.PLAYING) {
            throw new RuntimeException("Cannot remove currently playing song. Use skip instead");
        }

        // Delete entry
        queueRepository.delete(entry);

        // Broadcast queue update
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + room.getId() + "/queue",
            java.util.Map.of("type", "SONG_REMOVED", "queueEntryId", queueEntryId));
    }

    @Transactional(readOnly = true)
    public List<WorshipQueueEntryResponse> getQueueForRoom(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        List<WorshipQueueEntry> queue = queueRepository.findWaitingQueueForRoom(room);

        return queue.stream()
            .map(entry -> buildQueueEntryResponse(entry, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Optional<WorshipQueueEntryResponse> getCurrentlyPlaying(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        Optional<WorshipQueueEntry> currentEntry = queueRepository.findByWorshipRoomAndStatus(
            room, WorshipQueueEntry.QueueStatus.PLAYING
        );

        return currentEntry.map(entry -> buildQueueEntryResponse(entry, user));
    }

    // ==================== VOTING OPERATIONS ====================

    @Transactional
    public WorshipQueueEntryResponse vote(String userEmail, WorshipVoteRequest request) {
        User user = getUserByEmail(userEmail);
        WorshipQueueEntry entry = getQueueEntryByIdOrThrow(request.getQueueEntryId());
        WorshipRoom room = entry.getWorshipRoom();

        // Validate permissions
        if (!permissionService.canVote(user, room)) {
            throw new RuntimeException("Insufficient permissions to vote");
        }

        // Check if already voted
        WorshipSongVote.VoteType voteType = request.getVoteType() == WorshipVoteRequest.VoteType.UPVOTE
            ? WorshipSongVote.VoteType.UPVOTE
            : WorshipSongVote.VoteType.SKIP;

        Optional<WorshipSongVote> existingVote = voteRepository.findByQueueEntryAndUserAndVoteType(
            entry, user, voteType
        );

        if (existingVote.isPresent()) {
            // Remove vote (toggle)
            voteRepository.delete(existingVote.get());
            voteRepository.flush(); // Ensure delete is committed
        } else {
            // Add vote
            WorshipSongVote vote = new WorshipSongVote();
            vote.setQueueEntry(entry);
            vote.setUser(user);
            vote.setVoteType(voteType);
            voteRepository.save(vote);
            voteRepository.flush(); // Ensure save is committed
        }

        // Refresh the entry to get updated vote counts
        queueRepository.flush();
        entry = queueRepository.findById(entry.getId())
            .orElseThrow(() -> new RuntimeException("Queue entry not found"));

        // Check skip threshold
        if (voteType == WorshipSongVote.VoteType.SKIP &&
            entry.getStatus() == WorshipQueueEntry.QueueStatus.PLAYING) {
            checkSkipThreshold(entry, room);
        }

        // Broadcast vote update with refreshed vote counts
        WorshipQueueEntryResponse response = buildQueueEntryResponse(entry, user);
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + room.getId() + "/queue",
            java.util.Map.of("type", "VOTE_UPDATED", "queueEntry", response));

        return response;
    }

    // ==================== PLAYBACK CONTROL ====================

    @Transactional
    public WorshipQueueEntryResponse playNext(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate permissions
        if (!permissionService.canControlPlayback(user, room)) {
            throw new RuntimeException("Insufficient permissions to control playback");
        }

        // Mark current song as completed if exists
        Optional<WorshipQueueEntry> currentEntry = queueRepository.findByWorshipRoomAndStatus(
            room, WorshipQueueEntry.QueueStatus.PLAYING
        );

        currentEntry.ifPresent(entry -> {
            entry.markAsCompleted();
            queueRepository.save(entry);

            // Save to history
            saveToHistory(entry, room, user, false);
        });

        // Get next in queue
        Optional<WorshipQueueEntry> nextEntry = queueRepository.findNextInQueue(room);

        if (nextEntry.isEmpty()) {
            // No more songs in queue - stop playback
            room.stop();
            roomRepository.save(room);

            messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId + "/nowPlaying",
                java.util.Map.of("type", "PLAYBACK_STOPPED"));

            throw new RuntimeException("No more songs in queue");
        }

        // Play next song
        WorshipQueueEntry entry = nextEntry.get();
        entry.markAsPlaying();
        queueRepository.save(entry);

        // Update room state
        room.play(entry.getVideoId(), entry.getVideoTitle(), entry.getVideoThumbnailUrl(), user);
        roomRepository.save(room);

        // Clear votes for new song
        voteRepository.deleteByQueueEntry(entry);

        // Broadcast playback update
        WorshipQueueEntryResponse response = buildQueueEntryResponse(entry, user);
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId + "/nowPlaying",
            java.util.Map.of(
                "type", "NOW_PLAYING",
                "queueEntry", response,
                "scheduledPlayTime", System.currentTimeMillis() + 2000 // 2 second buffer for sync
            ));

        return response;
    }

    @Transactional
    public void skipCurrentSong(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate permissions
        if (!permissionService.canControlPlayback(user, room)) {
            throw new RuntimeException("Insufficient permissions to skip song");
        }

        // Get current song
        Optional<WorshipQueueEntry> currentEntry = queueRepository.findByWorshipRoomAndStatus(
            room, WorshipQueueEntry.QueueStatus.PLAYING
        );

        if (currentEntry.isEmpty()) {
            throw new RuntimeException("No song is currently playing");
        }

        WorshipQueueEntry entry = currentEntry.get();
        entry.markAsSkipped();
        queueRepository.save(entry);

        // Save to history
        saveToHistory(entry, room, user, true);

        // Play next song automatically
        try {
            playNext(userEmail, roomId);
        } catch (RuntimeException e) {
            // Queue is empty, already handled in playNext
        }
    }

    @Transactional
    public void updatePlaybackState(String userEmail, UUID roomId, WorshipPlaybackCommand command) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        if (!permissionService.canControlPlayback(user, room)) {
            throw new RuntimeException("Insufficient permissions to control playback");
        }

        switch (command.getAction()) {
            case PLAY -> {
                double startPosition = resolveRequestedPosition(command, room, 0.0);
                room.setCurrentLeader(user);
                if (command.getVideoId() != null && !command.getVideoId().isBlank()) {
                    room.setCurrentVideoId(command.getVideoId());
                }
                if (command.getVideoTitle() != null) {
                    room.setCurrentVideoTitle(command.getVideoTitle());
                }
                if (command.getVideoThumbnail() != null) {
                    room.setCurrentVideoThumbnail(command.getVideoThumbnail());
                }
                room.setPlaybackStatus("playing");
                room.setPlaybackPosition(startPosition);
                room.setPlaybackStartedAt(LocalDateTime.now());
                command.setSeekPosition(startPosition);
            }
            case RESUME -> {
                double resumePosition = resolveRequestedPosition(command, room, calculateCurrentPlaybackPosition(room));
                room.setPlaybackStatus("playing");
                room.setPlaybackPosition(resumePosition);
                room.setPlaybackStartedAt(LocalDateTime.now());
                command.setSeekPosition(resumePosition);
            }
            case PAUSE -> {
                double pausePosition = resolveRequestedPosition(command, room, calculateCurrentPlaybackPosition(room));
                room.setPlaybackStatus("paused");
                room.setPlaybackPosition(pausePosition);
                room.setPlaybackStartedAt(null);
                command.setSeekPosition(pausePosition);
            }
            case STOP -> {
                room.stop();
                command.setSeekPosition(0.0);
                command.setVideoId(null);
                command.setVideoTitle(null);
                command.setVideoThumbnail(null);
            }
            case SEEK -> {
                double targetPosition = resolveRequestedPosition(command, room, calculateCurrentPlaybackPosition(room));
                room.setPlaybackPosition(targetPosition);
                if ("playing".equals(room.getPlaybackStatus())) {
                    room.setPlaybackStartedAt(LocalDateTime.now());
                }
                command.setSeekPosition(targetPosition);
            }
            case SKIP -> {
                // Skip handled separately via skipCurrentSong
            }
        }

        roomRepository.save(room);
    }

    private double resolveRequestedPosition(WorshipPlaybackCommand command, WorshipRoom room, double fallback) {
        if (command.getSeekPosition() != null) {
            return Math.max(0.0, command.getSeekPosition());
        }

        return Math.max(0.0, fallback);
    }

    private double calculateCurrentPlaybackPosition(WorshipRoom room) {
        double basePosition = Optional.ofNullable(room.getPlaybackPosition()).orElse(0.0);

        if ("playing".equals(room.getPlaybackStatus()) && room.getPlaybackStartedAt() != null) {
            Duration elapsed = Duration.between(room.getPlaybackStartedAt(), LocalDateTime.now());
            if (!elapsed.isNegative()) {
                basePosition += elapsed.toMillis() / 1000.0;
            }
        }

        return Math.max(0.0, basePosition);
    }

    // ==================== HELPER METHODS ====================

    private void checkSkipThreshold(WorshipQueueEntry entry, WorshipRoom room) {
        long skipVotes = entry.getSkipVoteCount();
        long participantCount = room.getActiveParticipantCount();

        if (participantCount == 0) {
            return;
        }

        double skipPercentage = (double) skipVotes / participantCount;

        if (skipPercentage >= room.getSkipThreshold()) {
            // Skip threshold reached - skip song
            entry.markAsSkipped();
            queueRepository.save(entry);

            // Save to history
            saveToHistory(entry, room, room.getCurrentLeader(), true);

            // Broadcast skip
            messagingTemplate.convertAndSend("/topic/worship/rooms/" + room.getId() + "/nowPlaying",
                java.util.Map.of("type", "SONG_SKIPPED", "reason", "Skip threshold reached"));

            // Play next song (async to avoid recursion issues)
            try {
                Optional<WorshipQueueEntry> nextEntry = queueRepository.findNextInQueue(room);
                if (nextEntry.isPresent()) {
                    WorshipQueueEntry next = nextEntry.get();
                    next.markAsPlaying();
                    queueRepository.save(next);

                    room.play(next.getVideoId(), next.getVideoTitle(), next.getVideoThumbnailUrl(),
                        room.getCurrentLeader());
                    roomRepository.save(room);

                    messagingTemplate.convertAndSend("/topic/worship/rooms/" + room.getId() + "/nowPlaying",
                        java.util.Map.of(
                            "type", "NOW_PLAYING",
                            "queueEntry", buildQueueEntryResponse(next, room.getCurrentLeader()),
                            "scheduledPlayTime", System.currentTimeMillis() + 2000
                        ));
                }
            } catch (Exception e) {
                // Handle gracefully
            }
        }
    }

    private void saveToHistory(WorshipQueueEntry entry, WorshipRoom room, User leader, boolean wasSkipped) {
        WorshipPlayHistory history = new WorshipPlayHistory();
        history.setWorshipRoom(room);
        history.setLeader(leader);
        history.setVideoId(entry.getVideoId());
        history.setVideoTitle(entry.getVideoTitle());
        history.setVideoDuration(entry.getVideoDuration());
        history.setVideoThumbnailUrl(entry.getVideoThumbnailUrl());
        history.setWasSkipped(wasSkipped);

        if (wasSkipped) {
            history.markAsSkipped(
                (int) entry.getUpvoteCount(),
                (int) entry.getSkipVoteCount(),
                (int) room.getActiveParticipantCount()
            );
        } else {
            history.markAsCompleted(
                (int) entry.getUpvoteCount(),
                (int) entry.getSkipVoteCount(),
                (int) room.getActiveParticipantCount()
            );
        }

        historyRepository.save(history);
    }

    private void broadcastQueueUpdate(UUID roomId, String type, WorshipQueueEntry entry) {
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId + "/queue",
            java.util.Map.of(
                "type", type,
                "queueEntry", WorshipQueueEntryResponse.fromEntity(entry)
            ));
    }

    private WorshipQueueEntryResponse buildQueueEntryResponse(WorshipQueueEntry entry, User user) {
        WorshipQueueEntryResponse response = WorshipQueueEntryResponse.fromEntity(entry);

        // Use repository methods to get accurate vote counts from database
        // (Entity's lazy-loaded votes collection may not include newly saved votes)
        response.setUpvoteCount(voteRepository.countUpvotes(entry));
        response.setSkipVoteCount(voteRepository.countSkipVotes(entry));

        // Use repository to check user's votes
        response.setUserHasUpvoted(voteRepository.hasUserVoted(entry, user, WorshipSongVote.VoteType.UPVOTE));
        response.setUserHasVotedSkip(voteRepository.hasUserVoted(entry, user, WorshipSongVote.VoteType.SKIP));

        return response;
    }

    private User getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getIsActive()) {
            throw new RuntimeException("User account is not active");
        }

        return user;
    }

    private WorshipRoom getRoomByIdOrThrow(UUID roomId) {
        return roomRepository.findById(roomId)
            .orElseThrow(() -> new RuntimeException("Worship room not found"));
    }

    private WorshipQueueEntry getQueueEntryByIdOrThrow(UUID entryId) {
        return queueRepository.findById(entryId)
            .orElseThrow(() -> new RuntimeException("Queue entry not found"));
    }

    private WorshipRoomSettings getSettingsForRoom(WorshipRoom room) {
        return settingsRepository.findByWorshipRoom(room)
            .orElseGet(() -> {
                // Create default settings if not exists
                WorshipRoomSettings settings = WorshipRoomSettings.createDefault(room);
                return settingsRepository.save(settings);
            });
    }
}
