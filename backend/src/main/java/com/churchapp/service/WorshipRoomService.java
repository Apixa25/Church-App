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
