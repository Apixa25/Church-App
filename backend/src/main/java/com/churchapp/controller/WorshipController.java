package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.dto.PresignedUploadResponse;
import com.churchapp.service.FileUploadService;
import com.churchapp.service.WorshipPlaylistService;
import com.churchapp.service.WorshipQueueService;
import com.churchapp.service.WorshipRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/worship")
@RequiredArgsConstructor
@Slf4j
public class WorshipController {

    private final WorshipRoomService roomService;
    private final WorshipQueueService queueService;
    private final WorshipPlaylistService playlistService;
    private final FileUploadService fileUploadService;

    // ==================== ROOM ENDPOINTS ====================

    @GetMapping("/rooms")
    public ResponseEntity<List<WorshipRoomResponse>> getAllRooms(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getAllRooms(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching worship rooms", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rooms/public")
    public ResponseEntity<List<WorshipRoomResponse>> getPublicRooms(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getPublicRooms(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching public worship rooms", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rooms/my-rooms")
    public ResponseEntity<List<WorshipRoomResponse>> getUserRooms(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getUserRooms(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching user worship rooms", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rooms/playing")
    public ResponseEntity<List<WorshipRoomResponse>> getCurrentlyPlayingRooms(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getCurrentlyPlayingRooms(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching currently playing rooms", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<?> getRoomById(@AuthenticationPrincipal UserDetails userDetails,
                                        @PathVariable UUID roomId) {
        try {
            WorshipRoomResponse room = roomService.getRoomById(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            log.error("Error fetching worship room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@AuthenticationPrincipal UserDetails userDetails,
                                       @Valid @RequestBody WorshipRoomRequest request) {
        try {
            WorshipRoomResponse room = roomService.createRoom(userDetails.getUsername(), request);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            log.error("Error creating worship room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PutMapping("/rooms/{roomId}")
    public ResponseEntity<?> updateRoom(@AuthenticationPrincipal UserDetails userDetails,
                                       @PathVariable UUID roomId,
                                       @Valid @RequestBody WorshipRoomRequest request) {
        try {
            WorshipRoomResponse room = roomService.updateRoom(userDetails.getUsername(), roomId, request);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            log.error("Error updating worship room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/rooms/{roomId}")
    public ResponseEntity<?> deleteRoom(@AuthenticationPrincipal UserDetails userDetails,
                                       @PathVariable UUID roomId) {
        try {
            roomService.deleteRoom(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(successResponse("Room deleted successfully"));
        } catch (RuntimeException e) {
            log.error("Error deleting worship room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== PARTICIPANT ENDPOINTS ====================

    @PostMapping("/rooms/{roomId}/join")
    public ResponseEntity<?> joinRoom(@AuthenticationPrincipal UserDetails userDetails,
                                     @PathVariable UUID roomId) {
        try {
            WorshipRoomResponse room = roomService.joinRoom(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            log.error("Error joining worship room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@AuthenticationPrincipal UserDetails userDetails,
                                      @PathVariable UUID roomId) {
        try {
            roomService.leaveRoom(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(successResponse("Left room successfully"));
        } catch (RuntimeException e) {
            log.error("Error leaving worship room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @GetMapping("/rooms/{roomId}/participants")
    public ResponseEntity<?> getRoomParticipants(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable UUID roomId) {
        try {
            List<WorshipRoomParticipantResponse> participants = roomService.getRoomParticipants(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(participants);
        } catch (RuntimeException e) {
            log.error("Error fetching room participants", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== WAITLIST ENDPOINTS ====================

    @PostMapping("/rooms/{roomId}/waitlist/join")
    public ResponseEntity<?> joinWaitlist(@AuthenticationPrincipal UserDetails userDetails,
                                         @PathVariable UUID roomId) {
        try {
            roomService.joinWaitlist(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(successResponse("Joined waitlist successfully"));
        } catch (RuntimeException e) {
            log.error("Error joining waitlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/waitlist/leave")
    public ResponseEntity<?> leaveWaitlist(@AuthenticationPrincipal UserDetails userDetails,
                                          @PathVariable UUID roomId) {
        try {
            roomService.leaveWaitlist(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(successResponse("Left waitlist successfully"));
        } catch (RuntimeException e) {
            log.error("Error leaving waitlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @GetMapping("/rooms/{roomId}/waitlist")
    public ResponseEntity<?> getWaitlist(@AuthenticationPrincipal UserDetails userDetails,
                                        @PathVariable UUID roomId) {
        try {
            List<WorshipRoomParticipantResponse> waitlist = roomService.getWaitlist(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(waitlist);
        } catch (RuntimeException e) {
            log.error("Error fetching waitlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== QUEUE ENDPOINTS ====================

    @GetMapping("/rooms/{roomId}/queue")
    public ResponseEntity<?> getQueue(@AuthenticationPrincipal UserDetails userDetails,
                                     @PathVariable UUID roomId) {
        try {
            List<WorshipQueueEntryResponse> queue = queueService.getQueueForRoom(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(queue);
        } catch (RuntimeException e) {
            log.error("Error fetching queue", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @GetMapping("/rooms/{roomId}/queue/now-playing")
    public ResponseEntity<?> getCurrentlyPlaying(@AuthenticationPrincipal UserDetails userDetails,
                                                @PathVariable UUID roomId) {
        try {
            return queueService.getCurrentlyPlaying(userDetails.getUsername(), roomId)
                .map(entry -> ResponseEntity.ok((Object) entry))
                .orElse(ResponseEntity.ok(Map.of("message", "No song currently playing")));
        } catch (RuntimeException e) {
            log.error("Error fetching currently playing song", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/queue")
    public ResponseEntity<?> addToQueue(@AuthenticationPrincipal UserDetails userDetails,
                                       @PathVariable UUID roomId,
                                       @Valid @RequestBody WorshipQueueEntryRequest request) {
        try {
            request.setRoomId(roomId); // Ensure roomId matches path variable
            WorshipQueueEntryResponse entry = queueService.addToQueue(userDetails.getUsername(), request);
            return ResponseEntity.ok(entry);
        } catch (RuntimeException e) {
            log.error("Error adding to queue", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/queue/{queueEntryId}")
    public ResponseEntity<?> removeFromQueue(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID queueEntryId) {
        try {
            queueService.removeFromQueue(userDetails.getUsername(), queueEntryId);
            return ResponseEntity.ok(successResponse("Removed from queue successfully"));
        } catch (RuntimeException e) {
            log.error("Error removing from queue", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== VOTING ENDPOINTS ====================

    @PostMapping("/vote")
    public ResponseEntity<?> vote(@AuthenticationPrincipal UserDetails userDetails,
                                 @Valid @RequestBody WorshipVoteRequest request) {
        try {
            WorshipQueueEntryResponse entry = queueService.vote(userDetails.getUsername(), request);
            return ResponseEntity.ok(entry);
        } catch (RuntimeException e) {
            log.error("Error voting", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== PLAYBACK CONTROL ENDPOINTS ====================

    @PostMapping("/rooms/{roomId}/play-next")
    public ResponseEntity<?> playNext(@AuthenticationPrincipal UserDetails userDetails,
                                     @PathVariable UUID roomId) {
        try {
            WorshipQueueEntryResponse entry = queueService.playNext(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(entry);
        } catch (RuntimeException e) {
            log.error("Error playing next song", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/skip")
    public ResponseEntity<?> skipCurrentSong(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID roomId) {
        try {
            queueService.skipCurrentSong(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(successResponse("Song skipped successfully"));
        } catch (RuntimeException e) {
            log.error("Error skipping song", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== ROOM TYPE SPECIFIC ENDPOINTS ====================

    @GetMapping("/rooms/templates")
    public ResponseEntity<List<WorshipRoomResponse>> getTemplateRooms(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getTemplateRooms(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching template rooms", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rooms/live-events")
    public ResponseEntity<List<WorshipRoomResponse>> getLiveEventRooms(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getLiveEventRooms(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching live event rooms", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/rooms/live-events/upcoming")
    public ResponseEntity<List<WorshipRoomResponse>> getUpcomingLiveEvents(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipRoomResponse> rooms = roomService.getUpcomingLiveEvents(userDetails.getUsername());
            return ResponseEntity.ok(rooms);
        } catch (RuntimeException e) {
            log.error("Error fetching upcoming live events", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/rooms/{roomId}/start-template")
    public ResponseEntity<?> startTemplateRoom(@AuthenticationPrincipal UserDetails userDetails,
                                               @PathVariable UUID roomId) {
        try {
            WorshipRoomResponse room = roomService.startTemplateRoom(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            log.error("Error starting template room", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/start-live-event")
    public ResponseEntity<?> startLiveEvent(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID roomId) {
        try {
            WorshipRoomResponse room = roomService.startLiveEvent(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            log.error("Error starting live event", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/end-live-event")
    public ResponseEntity<?> endLiveEvent(@AuthenticationPrincipal UserDetails userDetails,
                                          @PathVariable UUID roomId) {
        try {
            roomService.endLiveEvent(userDetails.getUsername(), roomId);
            return ResponseEntity.ok(successResponse("Live event ended successfully"));
        } catch (RuntimeException e) {
            log.error("Error ending live event", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== PLAYLIST ENDPOINTS ====================

    @GetMapping("/playlists")
    public ResponseEntity<List<WorshipPlaylistResponse>> getPublicPlaylists(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipPlaylistResponse> playlists = playlistService.getPublicPlaylists(userDetails.getUsername());
            return ResponseEntity.ok(playlists);
        } catch (RuntimeException e) {
            log.error("Error fetching public playlists", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/playlists/my-playlists")
    public ResponseEntity<List<WorshipPlaylistResponse>> getMyPlaylists(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<WorshipPlaylistResponse> playlists = playlistService.getMyPlaylists(userDetails.getUsername());
            return ResponseEntity.ok(playlists);
        } catch (RuntimeException e) {
            log.error("Error fetching user playlists", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/playlists/popular")
    public ResponseEntity<List<WorshipPlaylistResponse>> getPopularPlaylists(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<WorshipPlaylistResponse> playlists = playlistService.getPopularPlaylists(userDetails.getUsername(), limit);
            return ResponseEntity.ok(playlists);
        } catch (RuntimeException e) {
            log.error("Error fetching popular playlists", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/playlists/search")
    public ResponseEntity<List<WorshipPlaylistResponse>> searchPlaylists(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String q) {
        try {
            List<WorshipPlaylistResponse> playlists = playlistService.searchPlaylists(userDetails.getUsername(), q);
            return ResponseEntity.ok(playlists);
        } catch (RuntimeException e) {
            log.error("Error searching playlists", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/playlists/{playlistId}")
    public ResponseEntity<?> getPlaylistById(@AuthenticationPrincipal UserDetails userDetails,
                                             @PathVariable UUID playlistId) {
        try {
            WorshipPlaylistResponse playlist = playlistService.getPlaylistById(userDetails.getUsername(), playlistId);
            return ResponseEntity.ok(playlist);
        } catch (RuntimeException e) {
            log.error("Error fetching playlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/playlists")
    public ResponseEntity<?> createPlaylist(@AuthenticationPrincipal UserDetails userDetails,
                                            @Valid @RequestBody WorshipPlaylistRequest request) {
        try {
            WorshipPlaylistResponse playlist = playlistService.createPlaylist(userDetails.getUsername(), request);
            return ResponseEntity.ok(playlist);
        } catch (RuntimeException e) {
            log.error("Error creating playlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PutMapping("/playlists/{playlistId}")
    public ResponseEntity<?> updatePlaylist(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID playlistId,
                                            @Valid @RequestBody WorshipPlaylistRequest request) {
        try {
            WorshipPlaylistResponse playlist = playlistService.updatePlaylist(userDetails.getUsername(), playlistId, request);
            return ResponseEntity.ok(playlist);
        } catch (RuntimeException e) {
            log.error("Error updating playlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/playlists/{playlistId}")
    public ResponseEntity<?> deletePlaylist(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID playlistId) {
        try {
            playlistService.deletePlaylist(userDetails.getUsername(), playlistId);
            return ResponseEntity.ok(successResponse("Playlist deleted successfully"));
        } catch (RuntimeException e) {
            log.error("Error deleting playlist", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== PLAYLIST ENTRY ENDPOINTS ====================

    @GetMapping("/playlists/{playlistId}/entries")
    public ResponseEntity<?> getPlaylistEntries(@AuthenticationPrincipal UserDetails userDetails,
                                                @PathVariable UUID playlistId) {
        try {
            List<WorshipPlaylistEntryResponse> entries = playlistService.getPlaylistEntries(userDetails.getUsername(), playlistId);
            return ResponseEntity.ok(entries);
        } catch (RuntimeException e) {
            log.error("Error fetching playlist entries", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PostMapping("/playlists/{playlistId}/entries")
    public ResponseEntity<?> addPlaylistEntry(@AuthenticationPrincipal UserDetails userDetails,
                                              @PathVariable UUID playlistId,
                                              @Valid @RequestBody WorshipPlaylistEntryRequest request) {
        try {
            WorshipPlaylistEntryResponse entry = playlistService.addEntry(userDetails.getUsername(), playlistId, request);
            return ResponseEntity.ok(entry);
        } catch (RuntimeException e) {
            log.error("Error adding playlist entry", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/playlists/entries/{entryId}")
    public ResponseEntity<?> removePlaylistEntry(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable UUID entryId) {
        try {
            playlistService.removeEntry(userDetails.getUsername(), entryId);
            return ResponseEntity.ok(successResponse("Entry removed successfully"));
        } catch (RuntimeException e) {
            log.error("Error removing playlist entry", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    @PutMapping("/playlists/entries/{entryId}/position")
    public ResponseEntity<?> updateEntryPosition(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable UUID entryId,
                                                 @RequestParam int position) {
        try {
            WorshipPlaylistEntryResponse entry = playlistService.updateEntryPosition(userDetails.getUsername(), entryId, position);
            return ResponseEntity.ok(entry);
        } catch (RuntimeException e) {
            log.error("Error updating entry position", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        }
    }

    // ==================== FILE UPLOAD ENDPOINTS ====================

    /**
     * Get pre-signed URL for direct S3 upload (X.com/Twitter approach)
     * This allows the client to upload directly to S3, bypassing NGINX size limits.
     */
    @PostMapping("/presigned-upload")
    public ResponseEntity<?> getPresignedUploadUrl(@AuthenticationPrincipal UserDetails userDetails,
                                                   @RequestBody Map<String, Object> request) {
        try {
            String fileName = (String) request.get("fileName");
            String contentType = (String) request.get("contentType");
            Long fileSize = request.get("fileSize") != null ?
                ((Number) request.get("fileSize")).longValue() : null;

            log.info("Generating presigned upload URL for user: {}, file: {}, type: {}, size: {}",
                userDetails.getUsername(), fileName, contentType, fileSize);

            // Validate image type
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(errorResponse("Only image files are allowed"));
            }

            // Validate file size (max 10MB for images)
            if (fileSize != null && fileSize > 10 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(errorResponse("File size exceeds maximum limit of 10MB"));
            }

            // Generate presigned URL
            PresignedUploadResponse result =
                fileUploadService.generatePresignedUploadUrl(fileName, contentType, fileSize, "worship-rooms");

            Map<String, Object> response = new HashMap<>();
            response.put("presignedUrl", result.getPresignedUrl());
            response.put("s3Key", result.getS3Key());
            response.put("finalUrl", result.getFileUrl());

            log.info("Generated presigned URL for key: {}", result.getS3Key());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error generating presigned upload URL", e);
            return ResponseEntity.badRequest().body(errorResponse("Failed to generate upload URL: " + e.getMessage()));
        }
    }

    /**
     * Confirm upload completion after client uploads directly to S3
     */
    @PostMapping("/confirm-upload")
    public ResponseEntity<?> confirmUpload(@AuthenticationPrincipal UserDetails userDetails,
                                           @RequestBody Map<String, Object> request) {
        try {
            String s3Key = (String) request.get("s3Key");
            String fileName = (String) request.get("fileName");
            String contentType = (String) request.get("contentType");
            Long fileSize = request.get("fileSize") != null ?
                ((Number) request.get("fileSize")).longValue() : null;

            log.info("Confirming upload for user: {}, s3Key: {}", userDetails.getUsername(), s3Key);

            if (s3Key == null || s3Key.isEmpty()) {
                return ResponseEntity.badRequest().body(errorResponse("s3Key is required"));
            }

            // Handle upload completion (this could update database records, etc.)
            String finalUrl = fileUploadService.handleUploadCompletion(s3Key, fileName, contentType, fileSize, "worship-rooms");

            Map<String, Object> response = new HashMap<>();
            response.put("url", finalUrl);
            response.put("success", true);

            log.info("Upload confirmed, final URL: {}", finalUrl);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error confirming upload", e);
            return ResponseEntity.badRequest().body(errorResponse("Failed to confirm upload: " + e.getMessage()));
        }
    }

    @PostMapping("/upload-room-image")
    public ResponseEntity<?> uploadRoomImage(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestParam("file") MultipartFile file) {
        try {
            log.info("Uploading room image for user: {}", userDetails.getUsername());
            String imageUrl = fileUploadService.uploadFile(file, "worship-rooms");
            log.info("Room image uploaded successfully: {}", imageUrl);
            return ResponseEntity.ok(imageUrl);
        } catch (IllegalArgumentException e) {
            log.error("Invalid file upload request", e);
            return ResponseEntity.badRequest().body(errorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error uploading room image", e);
            return ResponseEntity.badRequest().body(errorResponse("Failed to upload image: " + e.getMessage()));
        }
    }

    // ==================== HELPER METHODS ====================

    private Map<String, String> errorResponse(String message) {
        Map<String, String> response = new HashMap<>();
        response.put("error", message);
        return response;
    }

    private Map<String, String> successResponse(String message) {
        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        return response;
    }
}
