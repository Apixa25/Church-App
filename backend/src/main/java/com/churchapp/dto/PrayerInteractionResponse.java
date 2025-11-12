package com.churchapp.dto;

import com.churchapp.entity.PrayerInteraction;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PrayerInteractionResponse {
    
    private UUID id;
    private UUID prayerRequestId;
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    private PrayerInteraction.InteractionType type;
    private String content;
    private UUID parentInteractionId;
    private int replyCount;
    private LocalDateTime timestamp;
    
    public static PrayerInteractionResponse fromPrayerInteraction(PrayerInteraction interaction) {
        return new PrayerInteractionResponse(
            interaction.getId(),
            interaction.getPrayerRequest().getId(),
            interaction.getUser().getId(),
            interaction.getUser().getName(),
            interaction.getUser().getProfilePicUrl(),
            interaction.getType(),
            interaction.getContent(),
            interaction.getParentInteraction() != null ? interaction.getParentInteraction().getId() : null,
            interaction.getReplies() != null ? interaction.getReplies().size() : 0,
            interaction.getTimestamp()
        );
    }
}