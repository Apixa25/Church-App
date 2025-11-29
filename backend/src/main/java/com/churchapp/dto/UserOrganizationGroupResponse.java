package com.churchapp.dto;

import com.churchapp.entity.UserOrganizationGroup;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserOrganizationGroupResponse {
    private UUID id;
    private OrganizationInfo organization;
    private Boolean isMuted;
    private LocalDateTime joinedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizationInfo {
        private UUID id;
        private String name;
        private String type;
        private String logoUrl;
    }

    public static UserOrganizationGroupResponse fromEntity(UserOrganizationGroup entity) {
        UserOrganizationGroupResponse response = new UserOrganizationGroupResponse();
        response.setId(entity.getId());
        response.setIsMuted(entity.getIsMuted());
        response.setJoinedAt(entity.getJoinedAt());
        response.setCreatedAt(entity.getCreatedAt());
        response.setUpdatedAt(entity.getUpdatedAt());

        if (entity.getOrganization() != null) {
            OrganizationInfo orgInfo = new OrganizationInfo();
            orgInfo.setId(entity.getOrganization().getId());
            orgInfo.setName(entity.getOrganization().getName());
            orgInfo.setType(entity.getOrganization().getType().name());
            orgInfo.setLogoUrl(entity.getOrganization().getLogoUrl());
            response.setOrganization(orgInfo);
        }

        return response;
    }
}

