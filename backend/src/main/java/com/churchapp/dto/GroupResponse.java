package com.churchapp.dto;

import com.churchapp.entity.Group;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupResponse {

    private UUID id;
    private String name;
    private String description;
    private String type;
    private List<String> tags;
    private Map<String, Object> settings;

    // Creator information
    private UUID createdByUserId;
    private String createdByUserName;
    private UUID createdByOrgId;
    private String createdByOrgName;

    // Cross-org information
    private List<UUID> allowedOrgIds;

    // Statistics
    private Integer memberCount;

    // User's membership info (to be populated by controller)
    private String userRole; // CREATOR, MODERATOR, MEMBER
    private Boolean isMuted;
    private LocalDateTime joinedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Admin-only fields (populated for admin views)
    private String creatorName;
    private String creatorEmail;

    public static GroupResponse fromGroup(Group group) {
        GroupResponse response = new GroupResponse();
        response.setId(group.getId());
        response.setName(group.getName());
        response.setDescription(group.getDescription());
        response.setType(group.getType() != null ? group.getType().name() : null);
        response.setTags(group.getTags());
        response.setSettings(group.getSettings());

        // Creator information
        if (group.getCreatedByUser() != null) {
            response.setCreatedByUserId(group.getCreatedByUser().getId());
            response.setCreatedByUserName(group.getCreatedByUser().getName());
        }

        if (group.getCreatedByOrg() != null) {
            response.setCreatedByOrgId(group.getCreatedByOrg().getId());
            response.setCreatedByOrgName(group.getCreatedByOrg().getName());
        }

        response.setAllowedOrgIds(group.getAllowedOrgIds());
        response.setMemberCount(group.getMemberCount());
        response.setCreatedAt(group.getCreatedAt());
        response.setUpdatedAt(group.getUpdatedAt());

        return response;
    }

    // Simplified version for discovery/search (without settings)
    public static GroupResponse publicFromGroup(Group group) {
        GroupResponse response = new GroupResponse();
        response.setId(group.getId());
        response.setName(group.getName());
        response.setDescription(group.getDescription());
        response.setType(group.getType() != null ? group.getType().name() : null);
        response.setTags(group.getTags());
        response.setMemberCount(group.getMemberCount());
        response.setCreatedAt(group.getCreatedAt());

        if (group.getCreatedByUser() != null) {
            response.setCreatedByUserName(group.getCreatedByUser().getName());
        }

        if (group.getCreatedByOrg() != null) {
            response.setCreatedByOrgName(group.getCreatedByOrg().getName());
        }

        return response;
    }
}
