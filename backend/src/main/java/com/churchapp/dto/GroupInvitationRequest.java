package com.churchapp.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupInvitationRequest {

    @NotNull(message = "User ID is required")
    private UUID invitedUserId;

    @Size(max = 500, message = "Message cannot exceed 500 characters")
    private String message;
}
