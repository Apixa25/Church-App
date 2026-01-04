package com.churchapp.dto;

import com.churchapp.entity.GroupInviteLink;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupInviteLinkResponse {

    private UUID id;

    // Group information
    private UUID groupId;
    private String groupName;
    private String groupImageUrl;
    private String groupDescription;

    // Link details
    private String inviteCode;
    private String inviteUrl;
    private Integer useCount;
    private Boolean isActive;

    // Creator information
    private UUID createdById;
    private String createdByName;

    private LocalDateTime createdAt;

    public static GroupInviteLinkResponse fromEntity(GroupInviteLink link, String baseUrl) {
        GroupInviteLinkResponse response = new GroupInviteLinkResponse();
        response.setId(link.getId());
        response.setInviteCode(link.getInviteCode());
        response.setInviteUrl(baseUrl + "/invite/" + link.getInviteCode());
        response.setUseCount(link.getUseCount());
        response.setIsActive(link.getIsActive());
        response.setCreatedAt(link.getCreatedAt());

        if (link.getGroup() != null) {
            response.setGroupId(link.getGroup().getId());
            response.setGroupName(link.getGroup().getName());
            response.setGroupImageUrl(link.getGroup().getImageUrl());
            response.setGroupDescription(link.getGroup().getDescription());
        }

        if (link.getCreatedBy() != null) {
            response.setCreatedById(link.getCreatedBy().getId());
            response.setCreatedByName(link.getCreatedBy().getName());
        }

        return response;
    }
}
