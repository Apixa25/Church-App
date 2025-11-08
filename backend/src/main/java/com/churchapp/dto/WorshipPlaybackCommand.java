package com.churchapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaybackCommand {

    @NotNull(message = "Room ID is required")
    private UUID roomId;

    @NotNull(message = "Action is required")
    private PlaybackAction action;

    // For PLAY action
    private String videoId;
    private String videoTitle;
    private String videoThumbnail;

    // For SEEK action
    private Double seekPosition;

    // For syncing
    private Long scheduledPlayTime; // Timestamp when all clients should start playing

    public enum PlaybackAction {
        PLAY,       // Start playing a video
        PAUSE,      // Pause current video
        RESUME,     // Resume paused video
        STOP,       // Stop playback
        SKIP,       // Skip to next in queue
        SEEK        // Seek to position
    }

    // Static factory methods
    public static WorshipPlaybackCommand play(UUID roomId, String videoId, String videoTitle, String videoThumbnail) {
        WorshipPlaybackCommand command = new WorshipPlaybackCommand();
        command.setRoomId(roomId);
        command.setAction(PlaybackAction.PLAY);
        command.setVideoId(videoId);
        command.setVideoTitle(videoTitle);
        command.setVideoThumbnail(videoThumbnail);
        command.setScheduledPlayTime(System.currentTimeMillis() + 2000); // 2 seconds buffer
        return command;
    }

    public static WorshipPlaybackCommand pause(UUID roomId) {
        WorshipPlaybackCommand command = new WorshipPlaybackCommand();
        command.setRoomId(roomId);
        command.setAction(PlaybackAction.PAUSE);
        return command;
    }

    public static WorshipPlaybackCommand resume(UUID roomId) {
        WorshipPlaybackCommand command = new WorshipPlaybackCommand();
        command.setRoomId(roomId);
        command.setAction(PlaybackAction.RESUME);
        return command;
    }

    public static WorshipPlaybackCommand skip(UUID roomId) {
        WorshipPlaybackCommand command = new WorshipPlaybackCommand();
        command.setRoomId(roomId);
        command.setAction(PlaybackAction.SKIP);
        return command;
    }

    public static WorshipPlaybackCommand seek(UUID roomId, double position) {
        WorshipPlaybackCommand command = new WorshipPlaybackCommand();
        command.setRoomId(roomId);
        command.setAction(PlaybackAction.SEEK);
        command.setSeekPosition(position);
        return command;
    }
}
