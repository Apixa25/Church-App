package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.service.WorshipQueueService;
import com.churchapp.service.WorshipRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/worship")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class WorshipController {

    private final WorshipRoomService roomService;
    private final WorshipQueueService queueService;

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
