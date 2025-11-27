package com.churchapp.dto;

import com.churchapp.entity.FeedPreference;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedPreferenceResponse {

    private UUID id;
    private UUID userId;
    private String activeFilter; // ALL, PRIMARY_ONLY, SELECTED_GROUPS
    private List<UUID> selectedGroupIds;
    private UUID selectedOrganizationId; // For PRIMARY_ONLY filter - the specific organization ID
    private LocalDateTime updatedAt;

    public static FeedPreferenceResponse fromFeedPreference(FeedPreference preference) {
        if (preference == null) {
            return null;
        }

        FeedPreferenceResponse response = new FeedPreferenceResponse();
        response.setId(preference.getId());

        try {
            if (preference.getUser() != null) {
                response.setUserId(preference.getUser().getId());
            }
        } catch (Exception e) {
            // Handle LazyInitializationException or other issues
            // User ID might not be available, but we can still return the response
        }

        response.setActiveFilter(preference.getActiveFilter() != null ? preference.getActiveFilter().name() : null);
        response.setSelectedGroupIds(preference.getSelectedGroupIds() != null ? preference.getSelectedGroupIds() : new java.util.ArrayList<>());
        response.setSelectedOrganizationId(preference.getSelectedOrganizationId());
        response.setUpdatedAt(preference.getUpdatedAt());

        return response;
    }
}
