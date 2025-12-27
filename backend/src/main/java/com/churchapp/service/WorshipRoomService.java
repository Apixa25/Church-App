package com.churchapp.service;

import com.churchapp.dto.*;
import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class WorshipRoomService {

    private final WorshipRoomRepository roomRepository;
    private final WorshipRoomParticipantRepository participantRepository;
    private final WorshipRoomSettingsRepository settingsRepository;
    private final WorshipQueueRepository queueRepository;
    private final WorshipPlayHistoryRepository historyRepository;
    private final WorshipPlaylistRepository playlistRepository;
    private final WorshipPlaylistEntryRepository playlistEntryRepository;
    private final UserRepository userRepository;
    private final WorshipPermissionService permissionService;
    private final SimpMessagingTemplate messagingTemplate;

    // ==================== ROOM CRUD OPERATIONS ====================

    @Transactional
    public WorshipRoomResponse createRoom(String userEmail, WorshipRoomRequest request) {
        User user = getUserByEmail(userEmail);

        // Validate permissions
        if (!permissionService.canCreateRoom(user)) {
            throw new RuntimeException("Insufficient permissions to create worship room");
        }

        // Validate request
        if (!request.isValidSkipThreshold()) {
            throw new RuntimeException("Skip threshold must be between 0.0 and 1.0");
        }

        if (!request.isValidMaxParticipants()) {
            throw new RuntimeException("Max participants must be positive");
        }

        // Check for duplicate name
        if (roomRepository.findByNameAndIsActiveTrue(request.getName()).isPresent()) {
            throw new RuntimeException("A worship room with this name already exists");
        }

        // Create room
        WorshipRoom room = new WorshipRoom();
        room.setName(request.getName());
        room.setDescription(request.getDescription());
        room.setImageUrl(request.getImageUrl());
        room.setCreatedBy(user);
        room.setIsPrivate(request.getIsPrivate());
        room.setMaxParticipants(request.getMaxParticipants());
        room.setSkipThreshold(request.getSkipThreshold());
        room.setPlaybackStatus("stopped");
        room.setPlaybackPosition(0.0);

        // Set room type
        if (request.getRoomType() != null) {
            try {
                room.setRoomType(WorshipRoom.RoomType.valueOf(request.getRoomType()));
            } catch (IllegalArgumentException e) {
                room.setRoomType(WorshipRoom.RoomType.LIVE);
            }
        } else {
            room.setRoomType(WorshipRoom.RoomType.LIVE);
        }

        // Handle LIVE_EVENT specific fields
        if (room.getRoomType() == WorshipRoom.RoomType.LIVE_EVENT) {
            room.setScheduledStartTime(request.getScheduledStartTime());
            room.setScheduledEndTime(request.getScheduledEndTime());
            room.setLiveStreamUrl(request.getLiveStreamUrl());
            room.setAutoStartEnabled(request.getAutoStartEnabled() != null ? request.getAutoStartEnabled() : false);
            room.setAutoCloseEnabled(request.getAutoCloseEnabled() != null ? request.getAutoCloseEnabled() : true);
            room.setIsLiveStreamActive(false);
        }

        // Handle TEMPLATE specific fields
        if (room.getRoomType() == WorshipRoom.RoomType.TEMPLATE) {
            room.setIsTemplate(request.getIsTemplate() != null ? request.getIsTemplate() : true);
            room.setAllowUserStart(request.getAllowUserStart() != null ? request.getAllowUserStart() : true);

            // Link playlist if provided
            if (request.getPlaylistId() != null) {
                WorshipPlaylist playlist = playlistRepository.findById(request.getPlaylistId())
                    .orElseThrow(() -> new RuntimeException("Playlist not found"));
                room.setPlaylist(playlist);
            }
        }

        room = roomRepository.save(room);

        // Create default settings
        WorshipRoomSettings settings = WorshipRoomSettings.createDefault(room);
        settingsRepository.save(settings);

        // Add creator as moderator and participant
        WorshipRoomParticipant creatorParticipant = new WorshipRoomParticipant();
        creatorParticipant.setWorshipRoom(room);
        creatorParticipant.setUser(user);
        creatorParticipant.setRole(WorshipRoomParticipant.ParticipantRole.MODERATOR);
        creatorParticipant.setLastActiveAt(LocalDateTime.now());
        creatorParticipant = participantRepository.save(creatorParticipant);

        // Add participant to room's collection so isParticipant() works
        room.getParticipants().add(creatorParticipant);

        // Broadcast room creation
        messagingTemplate.convertAndSend("/topic/worship/rooms",
            Map.of("type", "ROOM_CREATED", "room", WorshipRoomResponse.fromEntity(room)));

        return buildRoomResponse(room, user);
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getAllRooms(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findByIsActiveTrueOrderByCreatedAtDesc();

        return rooms.stream()
            .map(room -> buildRoomResponse(room, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getPublicRooms(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findByIsPrivateFalseAndIsActiveTrueOrderByCreatedAtDesc();

        return rooms.stream()
            .map(room -> buildRoomResponse(room, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getUserRooms(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findRoomsByParticipant(user);

        return rooms.stream()
            .map(room -> buildRoomResponse(room, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getCurrentlyPlayingRooms(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findCurrentlyPlayingRooms();

        return rooms.stream()
            .map(room -> buildRoomResponse(room, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorshipRoomResponse getRoomById(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        return buildRoomResponse(room, user);
    }

    @Transactional
    public WorshipRoomResponse updateRoom(String userEmail, UUID roomId, WorshipRoomRequest request) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate permissions
        if (!permissionService.canEditRoom(user, room)) {
            throw new RuntimeException("Insufficient permissions to edit this room");
        }

        // Update room
        room.setName(request.getName());
        room.setDescription(request.getDescription());
        room.setImageUrl(request.getImageUrl());
        room.setIsPrivate(request.getIsPrivate());
        room.setMaxParticipants(request.getMaxParticipants());
        room.setSkipThreshold(request.getSkipThreshold());

        room = roomRepository.save(room);

        // Broadcast update
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId,
            Map.of("type", "ROOM_UPDATED", "room", WorshipRoomResponse.fromEntity(room)));

        return buildRoomResponse(room, user);
    }

    @Transactional
    public void deleteRoom(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate permissions
        if (!permissionService.canDeleteRoom(user, room)) {
            throw new RuntimeException("Insufficient permissions to delete this room");
        }

        // Soft delete
        room.setIsActive(false);
        roomRepository.save(room);

        // Broadcast deletion
        messagingTemplate.convertAndSend("/topic/worship/rooms",
            Map.of("type", "ROOM_DELETED", "roomId", roomId));
    }

    // ==================== PARTICIPANT OPERATIONS ====================

    @Transactional
    public WorshipRoomResponse joinRoom(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Check if already a participant
        Optional<WorshipRoomParticipant> existingParticipant =
            participantRepository.findByWorshipRoomAndUser(room, user);

        if (existingParticipant.isPresent()) {
            WorshipRoomParticipant participant = existingParticipant.get();

            // If participant was inactive, reactivate them
            if (!participant.getIsActive()) {
                participant.setIsActive(true);
                participant.setLeftAt(null);
                participant.setLastActiveAt(LocalDateTime.now());
                participantRepository.save(participant);

                // Broadcast rejoin
                messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId,
                    Map.of("type", "USER_JOINED", "participant", WorshipRoomParticipantResponse.fromEntity(participant)));
            } else {
                // Already an active participant - just update activity timestamp
                participant.updateActivity();
                participantRepository.save(participant);
            }

            return buildRoomResponse(room, user);
        }

        // Validate permissions for new participants
        if (!permissionService.canJoinRoom(user, room)) {
            throw new RuntimeException("Cannot join this room");
        }

        // Create new participant
        WorshipRoomParticipant participant = new WorshipRoomParticipant();
        participant.setWorshipRoom(room);
        participant.setUser(user);
        participant.setRole(WorshipRoomParticipant.ParticipantRole.LISTENER);
        participant.setLastActiveAt(LocalDateTime.now());
        participantRepository.save(participant);

        // Broadcast join
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId,
            Map.of("type", "USER_JOINED", "participant", WorshipRoomParticipantResponse.fromEntity(participant)));

        return buildRoomResponse(room, user);
    }

    @Transactional
    public void leaveRoom(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Find participant
        WorshipRoomParticipant participant = participantRepository
            .findByWorshipRoomAndUser(room, user)
            .orElseThrow(() -> new RuntimeException("Not a participant in this room"));

        // If user is current leader, stop playback and clear leader
        if (room.isCurrentLeader(user)) {
            room.stop();
            roomRepository.save(room);
        }

        // Mark as inactive
        participant.leave();
        participantRepository.save(participant);

        // Broadcast leave
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId,
            Map.of("type", "USER_LEFT", "userId", user.getId()));
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomParticipantResponse> getRoomParticipants(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        List<WorshipRoomParticipant> participants =
            participantRepository.findByWorshipRoomAndIsActiveTrueOrderByJoinedAtAsc(room);

        return participants.stream()
            .map(WorshipRoomParticipantResponse::fromEntity)
            .collect(Collectors.toList());
    }

    // ==================== WAITLIST OPERATIONS ====================

    @Transactional
    public void joinWaitlist(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate permissions
        if (!permissionService.canJoinWaitlist(user, room)) {
            throw new RuntimeException("Cannot join waitlist");
        }

        // Get participant
        WorshipRoomParticipant participant = participantRepository
            .findByWorshipRoomAndUser(room, user)
            .orElseThrow(() -> new RuntimeException("Not a participant in this room"));

        // Get next position
        Integer maxPosition = participantRepository.getMaxWaitlistPosition(room);
        int nextPosition = (maxPosition == null ? 0 : maxPosition) + 1;

        // Join waitlist
        participant.joinWaitlist(nextPosition);
        participantRepository.save(participant);

        // Broadcast waitlist update
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId + "/waitlist",
            Map.of("type", "USER_JOINED_WAITLIST", "participant", WorshipRoomParticipantResponse.fromEntity(participant)));
    }

    @Transactional
    public void leaveWaitlist(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Get participant
        WorshipRoomParticipant participant = participantRepository
            .findByWorshipRoomAndUser(room, user)
            .orElseThrow(() -> new RuntimeException("Not a participant in this room"));

        if (!participant.getIsInWaitlist()) {
            throw new RuntimeException("Not in waitlist");
        }

        // Leave waitlist
        participant.leaveWaitlist();
        participantRepository.save(participant);

        // Broadcast waitlist update
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId + "/waitlist",
            Map.of("type", "USER_LEFT_WAITLIST", "userId", user.getId()));
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomParticipantResponse> getWaitlist(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        List<WorshipRoomParticipant> waitlist = participantRepository.findWaitlistForRoom(room);

        return waitlist.stream()
            .map(WorshipRoomParticipantResponse::fromEntity)
            .collect(Collectors.toList());
    }

    // ==================== ROOM TYPE SPECIFIC OPERATIONS ====================

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getTemplateRooms(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findAvailableTemplateRooms();

        return rooms.stream()
            .map(room -> {
                WorshipRoomResponse response = buildRoomResponse(room, user);
                // Template rooms can be started by any user if allowUserStart is true
                response.setCanStart(room.getAllowUserStart() != null && room.getAllowUserStart());
                return response;
            })
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getLiveEventRooms(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findLiveEventRooms();

        return rooms.stream()
            .map(room -> buildRoomResponse(room, user))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipRoomResponse> getUpcomingLiveEvents(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<WorshipRoom> rooms = roomRepository.findUpcomingLiveEvents(LocalDateTime.now());

        return rooms.stream()
            .map(room -> buildRoomResponse(room, user))
            .collect(Collectors.toList());
    }

    /**
     * Start a template room - creates a new LIVE session from the template
     * and populates the queue from the playlist
     */
    @Transactional
    public WorshipRoomResponse startTemplateRoom(String userEmail, UUID templateRoomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom templateRoom = getRoomByIdOrThrow(templateRoomId);

        // Validate it's a template room
        if (templateRoom.getRoomType() != WorshipRoom.RoomType.TEMPLATE) {
            throw new RuntimeException("This is not a template room");
        }

        // Check if user can start this template
        if (!templateRoom.getAllowUserStart() && !templateRoom.isCreator(user)) {
            throw new RuntimeException("You don't have permission to start this template");
        }

        // Check if there's already an active session from this template
        List<WorshipRoom> existingSessions = roomRepository.findByPlaylistIdAndIsActiveTrue(
            templateRoom.getPlaylist() != null ? templateRoom.getPlaylist().getId() : null
        );

        boolean hasActiveSession = existingSessions.stream()
            .anyMatch(r -> r.getRoomType() == WorshipRoom.RoomType.LIVE && "playing".equals(r.getPlaybackStatus()));

        if (hasActiveSession) {
            throw new RuntimeException("There's already an active session from this template");
        }

        // Create a new LIVE room based on the template
        WorshipRoom liveRoom = new WorshipRoom();
        liveRoom.setName(templateRoom.getName() + " - Session");
        liveRoom.setDescription(templateRoom.getDescription());
        liveRoom.setImageUrl(templateRoom.getImageUrl());
        liveRoom.setCreatedBy(user);
        liveRoom.setCurrentLeader(user);
        liveRoom.setIsPrivate(false);
        liveRoom.setMaxParticipants(templateRoom.getMaxParticipants());
        liveRoom.setSkipThreshold(templateRoom.getSkipThreshold());
        liveRoom.setRoomType(WorshipRoom.RoomType.LIVE);
        liveRoom.setTemplateSource(templateRoom);
        liveRoom.setPlaylist(templateRoom.getPlaylist());
        liveRoom.setPlaybackStatus("stopped");
        liveRoom.setPlaybackPosition(0.0);
        liveRoom.setCurrentPlaylistPosition(0);

        liveRoom = roomRepository.save(liveRoom);

        // Create default settings
        WorshipRoomSettings settings = WorshipRoomSettings.createDefault(liveRoom);
        settingsRepository.save(settings);

        // Add user as moderator
        WorshipRoomParticipant participant = new WorshipRoomParticipant();
        participant.setWorshipRoom(liveRoom);
        participant.setUser(user);
        participant.setRole(WorshipRoomParticipant.ParticipantRole.MODERATOR);
        participant.setLastActiveAt(LocalDateTime.now());
        participantRepository.save(participant);

        // Populate queue from playlist if available
        if (templateRoom.getPlaylist() != null) {
            List<WorshipPlaylistEntry> playlistEntries = playlistEntryRepository
                .findByPlaylistIdOrderByPositionAsc(templateRoom.getPlaylist().getId());

            int position = 10000;
            for (WorshipPlaylistEntry playlistEntry : playlistEntries) {
                WorshipQueueEntry queueEntry = new WorshipQueueEntry();
                queueEntry.setWorshipRoom(liveRoom);
                queueEntry.setUser(user);
                queueEntry.setVideoId(playlistEntry.getVideoId());
                queueEntry.setVideoTitle(playlistEntry.getVideoTitle());
                queueEntry.setVideoDuration(playlistEntry.getVideoDuration());
                queueEntry.setVideoThumbnailUrl(playlistEntry.getVideoThumbnailUrl());
                queueEntry.setPosition(position);
                queueEntry.setStatus(WorshipQueueEntry.QueueStatus.WAITING);
                queueRepository.save(queueEntry);
                position += 10000;
            }

            // Increment playlist play count
            WorshipPlaylist playlist = templateRoom.getPlaylist();
            playlist.incrementPlayCount();
            playlistRepository.save(playlist);
        }

        // Broadcast room creation
        messagingTemplate.convertAndSend("/topic/worship/rooms",
            Map.of("type", "ROOM_CREATED", "room", WorshipRoomResponse.fromEntity(liveRoom)));

        return buildRoomResponse(liveRoom, user);
    }

    /**
     * Start a live stream event
     */
    @Transactional
    public WorshipRoomResponse startLiveEvent(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate it's a live event room
        if (room.getRoomType() != WorshipRoom.RoomType.LIVE_EVENT) {
            throw new RuntimeException("This is not a live event room");
        }

        // Check permissions
        if (!room.isCreator(user) && !permissionService.canEditRoom(user, room)) {
            throw new RuntimeException("You don't have permission to start this live event");
        }

        // Extract video ID from live stream URL
        String videoId = extractYouTubeVideoId(room.getLiveStreamUrl());
        if (videoId == null) {
            throw new RuntimeException("Invalid YouTube live stream URL");
        }

        // Start the live stream
        room.setIsLiveStreamActive(true);
        room.setCurrentVideoId(videoId);
        room.setCurrentVideoTitle(room.getName() + " - Live");
        room.setPlaybackStatus("playing");
        room.setPlaybackStartedAt(LocalDateTime.now());
        room.setCurrentLeader(user);

        room = roomRepository.save(room);

        // Broadcast the live event start
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId,
            Map.of("type", "LIVE_EVENT_STARTED", "room", WorshipRoomResponse.fromEntity(room)));

        return buildRoomResponse(room, user);
    }

    /**
     * End a live stream event
     */
    @Transactional
    public void endLiveEvent(String userEmail, UUID roomId) {
        User user = getUserByEmail(userEmail);
        WorshipRoom room = getRoomByIdOrThrow(roomId);

        // Validate it's a live event room
        if (room.getRoomType() != WorshipRoom.RoomType.LIVE_EVENT) {
            throw new RuntimeException("This is not a live event room");
        }

        // Check permissions
        if (!room.isCreator(user) && !permissionService.canEditRoom(user, room)) {
            throw new RuntimeException("You don't have permission to end this live event");
        }

        // End the live stream
        room.setIsLiveStreamActive(false);
        room.setPlaybackStatus("stopped");
        room.setCurrentVideoId(null);
        room.setCurrentVideoTitle(null);
        room.setPlaybackStartedAt(null);

        // If auto-close is enabled, deactivate the room
        if (room.getAutoCloseEnabled() != null && room.getAutoCloseEnabled()) {
            room.setIsActive(false);
        }

        roomRepository.save(room);

        // Broadcast the live event end
        messagingTemplate.convertAndSend("/topic/worship/rooms/" + roomId,
            Map.of("type", "LIVE_EVENT_ENDED", "roomId", roomId));
    }

    /**
     * Extract YouTube video ID from various URL formats including live streams
     */
    private String extractYouTubeVideoId(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }

        // Patterns for various YouTube URL formats
        String[] patterns = {
            "(?:youtube\\.com/watch\\?v=|youtu\\.be/)([a-zA-Z0-9_-]{11})",
            "youtube\\.com/embed/([a-zA-Z0-9_-]{11})",
            "youtube\\.com/v/([a-zA-Z0-9_-]{11})",
            "youtube\\.com/live/([a-zA-Z0-9_-]{11})",  // Live stream URL format
            "^([a-zA-Z0-9_-]{11})$"  // Just the video ID
        };

        for (String pattern : patterns) {
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(url);
            if (m.find()) {
                return m.group(1);
            }
        }

        return null;
    }

    // ==================== HELPER METHODS ====================

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

    private WorshipRoomResponse buildRoomResponse(WorshipRoom room, User user) {
        WorshipRoomResponse response = WorshipRoomResponse.fromEntity(room);

        // Add user context
        response.setIsParticipant(room.isParticipant(user));
        response.setIsCreator(room.isCreator(user));
        response.setIsCurrentLeader(room.isCurrentLeader(user));
        response.setCanJoin(permissionService.canJoinRoom(user, room));
        response.setUserRole(permissionService.getParticipantRole(user, room).name());
        response.setCanEdit(permissionService.canEditRoom(user, room));
        response.setCanDelete(permissionService.canDeleteRoom(user, room));

        // Check if user is in waitlist
        Optional<WorshipRoomParticipant> participantOpt =
            participantRepository.findByWorshipRoomAndUser(room, user);

        participantOpt.ifPresent(participant -> {
            response.setIsInWaitlist(participant.getIsInWaitlist());
            response.setWaitlistPosition(participant.getWaitlistPosition());
        });

        return response;
    }

    // Missing import fix
    private static class Map {
        public static java.util.Map<String, Object> of(String k1, Object v1, String k2, Object v2) {
            return java.util.Map.of(k1, v1, k2, v2);
        }
        public static java.util.Map<String, Object> of(String k1, Object v1) {
            return java.util.Map.of(k1, v1);
        }
    }
}
