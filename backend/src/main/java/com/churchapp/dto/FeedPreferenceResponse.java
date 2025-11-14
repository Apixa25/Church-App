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
    private LocalDateTime updatedAt;

    public static FeedPreferenceResponse fromFeedPreference(FeedPreference preference) {
        FeedPreferenceResponse response = new FeedPreferenceResponse();
        response.setId(preference.getId());

        if (preference.getUser() != null) {
            response.setUserId(preference.getUser().getId());
        }

        response.setActiveFilter(preference.getActiveFilter() != null ? preference.getActiveFilter().name() : null);
        response.setSelectedGroupIds(preference.getSelectedGroupIds());
        response.setUpdatedAt(preference.getUpdatedAt());

        return response;
    }
}
