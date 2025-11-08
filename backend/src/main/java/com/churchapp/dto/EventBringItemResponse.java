package com.churchapp.dto;

import com.churchapp.entity.EventBringItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventBringItemResponse {

    private UUID id;
    private String name;
    private String description;
    private Integer quantityNeeded;
    private Integer quantityClaimed;
    private Integer quantityRemaining;
    private Boolean allowMultipleClaims;
    private UUID createdById;
    private String createdByName;
    private String createdByProfilePicUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean canEdit;
    private EventBringClaimResponse userClaim;
    private List<EventBringClaimResponse> claims;

    public static EventBringItemResponse fromEntity(EventBringItem item, UUID currentUserId, boolean canEdit) {
        int claimed = item.getClaims() == null ? 0 :
            item.getClaims().stream()
                .mapToInt(claim -> claim.getQuantity() != null ? claim.getQuantity() : 0)
                .sum();

        Integer quantityRemaining = null;
        if (item.getQuantityNeeded() != null) {
            quantityRemaining = Math.max(item.getQuantityNeeded() - claimed, 0);
        }

        List<EventBringClaimResponse> claimResponses = item.getClaims() == null ? Collections.emptyList() :
            item.getClaims()
                .stream()
                .map(EventBringClaimResponse::fromEntity)
                .collect(Collectors.toList());

        EventBringClaimResponse userClaim = currentUserId == null ? null :
            claimResponses.stream()
                .filter(claim -> claim.getUserId().equals(currentUserId))
                .findFirst()
                .orElse(null);

        return EventBringItemResponse.builder()
            .id(item.getId())
            .name(item.getName())
            .description(item.getDescription())
            .quantityNeeded(item.getQuantityNeeded())
            .quantityClaimed(claimed)
            .quantityRemaining(quantityRemaining)
            .allowMultipleClaims(item.getAllowMultipleClaims())
            .createdById(item.getCreatedBy() != null ? item.getCreatedBy().getId() : null)
            .createdByName(item.getCreatedBy() != null ? item.getCreatedBy().getName() : null)
            .createdByProfilePicUrl(item.getCreatedBy() != null ? item.getCreatedBy().getProfilePicUrl() : null)
            .createdAt(item.getCreatedAt())
            .updatedAt(item.getUpdatedAt())
            .canEdit(canEdit)
            .userClaim(userClaim)
            .claims(claimResponses)
            .build();
    }
}

