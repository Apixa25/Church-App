package com.churchapp.dto;

import com.churchapp.entity.User;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserManagementResponse {
    private UUID id;
    private String name;
    private String email;
    private String role;
    private String profilePicUrl;
    private String bio;
    private boolean isActive;
    private boolean isBanned;
    private int warningCount;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastLogin;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime bannedAt;

    private String banReason;

    // Activity metrics
    private long totalPosts;
    private long totalComments;
    private long totalPrayers;
    private long totalDonations;

    public static UserManagementResponse fromUser(User user) {
        return UserManagementResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole().name())
            .profilePicUrl(user.getProfilePicUrl())
            .bio(user.getBio())
            .isActive(Boolean.TRUE.equals(user.getIsActive()))
            .isBanned(user.isBanned())
            .warningCount(user.getWarningCount())
            .createdAt(user.getCreatedAt())
            .lastLogin(user.getLastLogin())
            .bannedAt(user.getBannedAt())
            .banReason(user.getBanReason())
            .build();
    }
}