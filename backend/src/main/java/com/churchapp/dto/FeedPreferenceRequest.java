package com.churchapp.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedPreferenceRequest {

    @NotBlank(message = "Feed filter is required")
    private String activeFilter; // ALL, PRIMARY_ONLY, SELECTED_GROUPS

    // For SELECTED_GROUPS filter - list of group IDs to show
    private List<UUID> selectedGroupIds;
    
    // For PRIMARY_ONLY filter - the specific organization ID to filter by
    private UUID selectedOrganizationId;
}
