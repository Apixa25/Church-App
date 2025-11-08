package com.churchapp.dto;

import com.churchapp.entity.EventBringClaim;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventBringClaimResponse {

    private UUID id;
    private UUID itemId;
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    private Integer quantity;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static EventBringClaimResponse fromEntity(EventBringClaim claim) {
        return EventBringClaimResponse.builder()
            .id(claim.getId())
            .itemId(claim.getItem().getId())
            .userId(claim.getUser().getId())
            .userName(claim.getUser().getName())
            .userProfilePicUrl(claim.getUser().getProfilePicUrl())
            .quantity(claim.getQuantity())
            .note(claim.getNote())
            .createdAt(claim.getCreatedAt())
            .updatedAt(claim.getUpdatedAt())
            .build();
    }
}

