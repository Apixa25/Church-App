package com.churchapp.dto;

import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.entity.UserGroupMembership;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MembershipResponse {

    // Common fields for both org and group memberships
    private UUID id;
    private UUID userId;
    private String userName;
    private String userAvatarUrl;
    private String role;
    private LocalDateTime joinedAt;
    private LocalDateTime createdAt;

    // Organization-specific fields
    private UUID organizationId;
    private String organizationName;
    private String organizationLogoUrl;
    private Boolean isPrimary;

    // Group-specific fields
    private UUID groupId;
    private String groupName;
    private Boolean isMuted;

    // Factory method for organization memberships
    public static MembershipResponse fromOrgMembership(UserOrganizationMembership membership) {
        MembershipResponse response = new MembershipResponse();
        response.setId(membership.getId());

        if (membership.getUser() != null) {
            response.setUserId(membership.getUser().getId());
            response.setUserName(membership.getUser().getName());
            response.setUserAvatarUrl(membership.getUser().getProfilePicUrl());
        }

        if (membership.getOrganization() != null) {
            response.setOrganizationId(membership.getOrganization().getId());
            response.setOrganizationName(membership.getOrganization().getName());
            response.setOrganizationLogoUrl(membership.getOrganization().getLogoUrl());
        }

        response.setRole(membership.getRole() != null ? membership.getRole().name() : null);
        response.setIsPrimary(membership.getIsPrimary());
        response.setJoinedAt(membership.getJoinedAt());
        response.setCreatedAt(membership.getCreatedAt());

        return response;
    }

    // Factory method for group memberships
    public static MembershipResponse fromGroupMembership(UserGroupMembership membership) {
        MembershipResponse response = new MembershipResponse();
        response.setId(membership.getId());

        if (membership.getUser() != null) {
            response.setUserId(membership.getUser().getId());
            response.setUserName(membership.getUser().getName());
            response.setUserAvatarUrl(membership.getUser().getProfilePicUrl());
        }

        if (membership.getGroup() != null) {
            response.setGroupId(membership.getGroup().getId());
            response.setGroupName(membership.getGroup().getName());
        }

        response.setRole(membership.getRole() != null ? membership.getRole().name() : null);
        response.setIsMuted(membership.getIsMuted());
        response.setJoinedAt(membership.getJoinedAt());
        response.setCreatedAt(membership.getCreatedAt());

        return response;
    }
}
