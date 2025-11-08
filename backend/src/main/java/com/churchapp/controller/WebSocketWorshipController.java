package com.churchapp.controller;

import com.churchapp.dto.WorshipPlaybackCommand;
import com.churchapp.service.WorshipQueueService;
import com.churchapp.service.WorshipRoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
@Slf4j
public class WebSocketWorshipController {

    private final WorshipRoomService roomService;
    private final WorshipQueueService queueService;
    private final SimpMessagingTemplate messagingTemplate;

    // ==================== PLAYBACK CONTROL ====================

    /**
     * Handle playback commands (play, pause, seek, skip)
     * Broadcasts to all clients in the room
     */
    @MessageMapping("/worship/rooms/{roomId}/control")
    public void handlePlaybackControl(@DestinationVariable UUID roomId,
                                     @Payload WorshipPlaybackCommand command,
                                     Principal principal) {
        try {
            log.info("Playback control received for room {}: {}", roomId, command.getAction());

            // Ensure roomId matches
            command.setRoomId(roomId);

            // Handle different actions
            switch (command.getAction()) {
                case PLAY:
                    queueService.updatePlaybackState(principal.getName(), roomId, command);
                    // Broadcast play command to all clients
                    broadcastPlaybackCommand(roomId, command);
                    break;

                case PAUSE:
                    queueService.updatePlaybackState(principal.getName(), roomId, command);
                    // Broadcast pause command
                    broadcastPlaybackCommand(roomId, command);
                    break;

                case RESUME:
                    queueService.updatePlaybackState(principal.getName(), roomId, command);
                    // Broadcast resume command
                    broadcastPlaybackCommand(roomId, command);
                    break;

                case STOP:
                    queueService.updatePlaybackState(principal.getName(), roomId, command);
                    broadcastPlaybackCommand(roomId, command);
                    break;

                case SKIP:
                    // Skip current song via service (handles queue advancement)
                    queueService.skipCurrentSong(principal.getName(), roomId);
                    // Next song broadcast handled in service
                    break;

                case SEEK:
                    queueService.updatePlaybackState(principal.getName(), roomId, command);
                    // Broadcast seek command
                    broadcastPlaybackCommand(roomId, command);
                    break;

                default:
                    log.warn("Unknown playback action: {}", command.getAction());
            }

        } catch (Exception e) {
            log.error("Error handling playback control", e);
            sendErrorToUser(principal.getName(), "Failed to control playback: " + e.getMessage());
        }
    }

    /**
     * Handle activity heartbeat to track active users
     * Clients should send this every 30 seconds
     */
    @MessageMapping("/worship/rooms/{roomId}/heartbeat")
    public void handleHeartbeat(@DestinationVariable UUID roomId,
                               Principal principal) {
        try {
            // Update last active time
            log.debug("Heartbeat received from {} in room {}", principal.getName(), roomId);

            // Broadcast participant count update
            Map<String, Object> update = new HashMap<>();
            update.put("type", "PARTICIPANT_ACTIVE");
            update.put("username", principal.getName());
            update.put("timestamp", LocalDateTime.now());

            messagingTemplate.convertAndSend(
                "/topic/worship/rooms/" + roomId,
                update
            );

        } catch (Exception e) {
            log.error("Error handling heartbeat", e);
        }
    }

    /**
     * Handle sync requests from clients
     * Used when a client rejoins and needs current playback state
     */
    @MessageMapping("/worship/rooms/{roomId}/sync")
    public void handleSyncRequest(@DestinationVariable UUID roomId,
                                 Principal principal) {
        try {
            log.info("Sync request from {} for room {}", principal.getName(), roomId);

            // Get current room state
            var roomResponse = roomService.getRoomById(principal.getName(), roomId);

            // Send current state to requesting user
            Map<String, Object> syncData = new HashMap<>();
            syncData.put("type", "SYNC_STATE");
            syncData.put("playbackStatus", roomResponse.getPlaybackStatus());
            double playbackPosition = roomResponse.getPlaybackPosition() != null
                ? roomResponse.getPlaybackPosition()
                : 0.0;
            if ("playing".equalsIgnoreCase(roomResponse.getPlaybackStatus())
                && roomResponse.getPlaybackStartedAt() != null) {
                Duration elapsed = Duration.between(roomResponse.getPlaybackStartedAt(), LocalDateTime.now());
                if (!elapsed.isNegative()) {
                    playbackPosition += elapsed.toMillis() / 1000.0;
                }
            }
            syncData.put("playbackPosition", Math.max(0.0, playbackPosition));
            syncData.put("currentVideoId", roomResponse.getCurrentVideoId());
            syncData.put("currentVideoTitle", roomResponse.getCurrentVideoTitle());
            syncData.put("currentVideoThumbnail", roomResponse.getCurrentVideoThumbnail());
            syncData.put("playbackStartedAt", roomResponse.getPlaybackStartedAt());
            syncData.put("timestamp", System.currentTimeMillis());

            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/worship/sync",
                syncData
            );

        } catch (Exception e) {
            log.error("Error handling sync request", e);
            sendErrorToUser(principal.getName(), "Failed to sync: " + e.getMessage());
        }
    }

    /**
     * Handle user presence updates (join/leave room)
     */
    @MessageMapping("/worship/rooms/{roomId}/presence")
    public void handlePresence(@DestinationVariable UUID roomId,
                              @Payload Map<String, Object> payload,
                              Principal principal) {
        try {
            String status = (String) payload.get("status"); // "online" or "offline"

            Map<String, Object> presenceUpdate = new HashMap<>();
            presenceUpdate.put("type", "USER_PRESENCE");
            presenceUpdate.put("username", principal.getName());
            presenceUpdate.put("status", status);
            presenceUpdate.put("timestamp", LocalDateTime.now());

            messagingTemplate.convertAndSend(
                "/topic/worship/rooms/" + roomId,
                presenceUpdate
            );

        } catch (Exception e) {
            log.error("Error handling presence update", e);
        }
    }

    // ==================== HELPER METHODS ====================

    private void broadcastPlaybackCommand(UUID roomId, WorshipPlaybackCommand command) {
        Map<String, Object> broadcast = new HashMap<>();
        broadcast.put("type", "PLAYBACK_COMMAND");
        broadcast.put("action", command.getAction().name());
        broadcast.put("videoId", command.getVideoId());
        broadcast.put("videoTitle", command.getVideoTitle());
        broadcast.put("videoThumbnail", command.getVideoThumbnail());
        broadcast.put("seekPosition", command.getSeekPosition());
        broadcast.put("scheduledPlayTime", command.getScheduledPlayTime());
        broadcast.put("timestamp", System.currentTimeMillis());

        messagingTemplate.convertAndSend(
            "/topic/worship/rooms/" + roomId + "/playback",
            broadcast
        );
    }

    private void sendErrorToUser(String username, String errorMessage) {
        Map<String, String> error = new HashMap<>();
        error.put("error", errorMessage);
        error.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSendToUser(
            username,
            "/queue/errors",
            error
        );
    }

    private Map<String, String> createErrorMessage(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        error.put("timestamp", LocalDateTime.now().toString());
        return error;
    }
}
