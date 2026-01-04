package com.churchapp.dto;

import com.churchapp.entity.GroupInvitation;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupInvitationResponse {

    private UUID id;

    // Group information
    private UUID groupId;
    private String groupName;
    private String groupImageUrl;
    private String groupDescription;

    // Inviter information
    private UUID inviterId;
    private String inviterName;
    private String inviterAvatarUrl;

    // Invited user information
    private UUID invitedUserId;
    private String invitedUserName;
    private String invitedUserAvatarUrl;

    // Invitation details
    private String status;
    private String message;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public static GroupInvitationResponse fromEntity(GroupInvitation invitation) {
        GroupInvitationResponse response = new GroupInvitationResponse();
        response.setId(invitation.getId());

        if (invitation.getGroup() != null) {
            response.setGroupId(invitation.getGroup().getId());
            response.setGroupName(invitation.getGroup().getName());
            response.setGroupImageUrl(invitation.getGroup().getImageUrl());
            response.setGroupDescription(invitation.getGroup().getDescription());
        }

        if (invitation.getInviter() != null) {
            response.setInviterId(invitation.getInviter().getId());
            response.setInviterName(invitation.getInviter().getName());
            response.setInviterAvatarUrl(invitation.getInviter().getProfilePicUrl());
        }

        if (invitation.getInvitedUser() != null) {
            response.setInvitedUserId(invitation.getInvitedUser().getId());
            response.setInvitedUserName(invitation.getInvitedUser().getName());
            response.setInvitedUserAvatarUrl(invitation.getInvitedUser().getProfilePicUrl());
        }

        response.setStatus(invitation.getStatus() != null ? invitation.getStatus().name() : null);
        response.setMessage(invitation.getMessage());
        response.setCreatedAt(invitation.getCreatedAt());
        response.setRespondedAt(invitation.getRespondedAt());

        return response;
    }
}
