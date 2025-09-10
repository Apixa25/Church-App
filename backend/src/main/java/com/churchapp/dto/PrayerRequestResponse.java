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
    private Boolean isAnonymous;
    private PrayerRequest.PrayerCategory category;
    private PrayerRequest.PrayerStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private PrayerInteractionSummary interactionSummary;
    
    public static PrayerRequestResponse fromPrayerRequest(PrayerRequest prayerRequest) {
        return new PrayerRequestResponse(
            prayerRequest.getId(),
            prayerRequest.getUser().getId(),
            // Handle anonymous prayers - don't show user details
            prayerRequest.getIsAnonymous() ? "Anonymous" : prayerRequest.getUser().getName(),
            prayerRequest.getIsAnonymous() ? null : prayerRequest.getUser().getProfilePicUrl(),
            prayerRequest.getTitle(),
            prayerRequest.getDescription(),
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
            prayerRequest.getIsAnonymous(),
            prayerRequest.getCategory(),
            prayerRequest.getStatus(),
            prayerRequest.getCreatedAt(),
            prayerRequest.getUpdatedAt(),
            null // interactionSummary will be set separately if needed
        );
    }
}