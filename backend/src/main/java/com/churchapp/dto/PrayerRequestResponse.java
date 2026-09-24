package com.churchapp.dto;

import com.churchapp.entity.PrayerRequest;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PrayerRequestResponse {
    
    private UUID id;
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    private String title;
    private String description;
    private String imageUrl;
    private Boolean isAnonymous;
    private PrayerRequest.PrayerCategory category;
    private PrayerRequest.PrayerStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private PrayerInteractionSummary interactionSummary;
    
    /**
     * Viewer-facing projection. For anonymous prayers every identifying field
     * (id, name, picture) is withheld, not just the display name — the UI hiding
     * a link is not anonymity if the id is still in the JSON.
     */
    public static PrayerRequestResponse fromPrayerRequest(PrayerRequest prayerRequest) {
        boolean anonymous = Boolean.TRUE.equals(prayerRequest.getIsAnonymous());
        return new PrayerRequestResponse(
            prayerRequest.getId(),
            anonymous ? null : prayerRequest.getUser().getId(),
            anonymous ? "Anonymous" : prayerRequest.getUser().getName(),
            anonymous ? null : prayerRequest.getUser().getProfilePicUrl(),
            prayerRequest.getTitle(),
            prayerRequest.getDescription(),
            prayerRequest.getImageUrl(),
            prayerRequest.getIsAnonymous(),
            prayerRequest.getCategory(),
            prayerRequest.getStatus(),
            prayerRequest.getCreatedAt(),
            prayerRequest.getUpdatedAt(),
            null // interactionSummary will be set separately if needed
        );
    }
    
    public static PrayerRequestResponse fromPrayerRequestForOwner(PrayerRequest prayerRequest) {
        // For the owner, always show their details even if anonymous to others
        return new PrayerRequestResponse(
            prayerRequest.getId(),
            prayerRequest.getUser().getId(),
            prayerRequest.getUser().getName(),
            prayerRequest.getUser().getProfilePicUrl(),
            prayerRequest.getTitle(),
            prayerRequest.getDescription(),
            prayerRequest.getImageUrl(),
            prayerRequest.getIsAnonymous(),
            prayerRequest.getCategory(),
            prayerRequest.getStatus(),
            prayerRequest.getCreatedAt(),
            prayerRequest.getUpdatedAt(),
            null // interactionSummary will be set separately if needed
        );
    }
}