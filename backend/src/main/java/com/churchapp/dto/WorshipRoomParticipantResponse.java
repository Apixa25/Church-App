package com.churchapp.dto;

import com.churchapp.entity.WorshipRoomParticipant;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorshipRoomParticipantResponse {

    private UUID id;
    private UUID roomId;
    private UUID userId;
    private String userName;
    private String userProfilePic;
    private String role; // LISTENER, DJ, LEADER, MODERATOR
    private Boolean isActive;
    private Boolean isInWaitlist;
    private Integer waitlistPosition;
    private LocalDateTime joinedAt;
    private LocalDateTime lastActiveAt;
    private LocalDateTime updatedAt;

    // Animated avatar for dance floor display
    private WorshipAvatarResponse avatar;

    // Constructor from entity
    public WorshipRoomParticipantResponse(WorshipRoomParticipant participant) {
        this.id = participant.getId();
        this.roomId = participant.getWorshipRoom() != null ? participant.getWorshipRoom().getId() : null;
        this.userId = participant.getUser() != null ? participant.getUser().getId() : null;
        this.userName = participant.getUser() != null ? participant.getUser().getName() : null;
        this.userProfilePic = participant.getUser() != null ? participant.getUser().getProfilePicUrl() : null;
        this.role = participant.getRole() != null ? participant.getRole().name() : null;
        this.isActive = participant.getIsActive();
        this.isInWaitlist = participant.getIsInWaitlist();
        this.waitlistPosition = participant.getWaitlistPosition();
        this.joinedAt = participant.getJoinedAt();
        this.lastActiveAt = participant.getLastActiveAt();
        this.updatedAt = participant.getUpdatedAt();
    }

    // Constructor from entity with avatar
    public WorshipRoomParticipantResponse(WorshipRoomParticipant participant, WorshipAvatarResponse avatar) {
        this(participant);
        this.avatar = avatar;
    }

    // Static factory method
    public static WorshipRoomParticipantResponse fromEntity(WorshipRoomParticipant participant) {
        return new WorshipRoomParticipantResponse(participant);
    }

    // Static factory method with avatar
    public static WorshipRoomParticipantResponse fromEntity(WorshipRoomParticipant participant, WorshipAvatarResponse avatar) {
        return new WorshipRoomParticipantResponse(participant, avatar);
    }

    // Helper methods
    public boolean canControlPlayback() {
        return "LEADER".equals(role) || "MODERATOR".equals(role);
    }

    public boolean canAddToQueue() {
        return "DJ".equals(role) || "LEADER".equals(role) || "MODERATOR".equals(role);
    }

    public boolean canModerateRoom() {
        return "MODERATOR".equals(role);
    }

    public String getRoleDisplayName() {
        if (role == null) return "Listener";
        switch (role) {
            case "LISTENER": return "Listener";
            case "DJ": return "DJ";
            case "LEADER": return "Worship Leader";
            case "MODERATOR": return "Moderator";
            default: return role;
        }
    }
}
