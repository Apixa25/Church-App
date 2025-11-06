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
        // A user is active if:
        // 1. They are not banned
        // 2. They are not soft-deleted
        // 3. Their isActive field is not explicitly false
        // Note: By default, all non-banned, non-deleted users are considered active
        // This handles existing users that may have is_active = false in the database
        // The ensureUsersAreActive() method in DataInitializer will update the database on next startup
        // to ensure isActive = true for all non-banned, non-deleted users
        // For now, we treat users as active if they're not banned/deleted, even if isActive = false
        // This is because existing users may have is_active = false due to database initialization issues
        boolean isActive = !user.isBanned() && user.getDeletedAt() == null;
        
        return UserManagementResponse.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .role(user.getRole().name())
            .profilePicUrl(user.getProfilePicUrl())
            .bio(user.getBio())
            .isActive(isActive)
            .isBanned(user.isBanned())
            .warningCount(user.getWarningCount())
            .createdAt(user.getCreatedAt())
            .lastLogin(user.getLastLogin())
            .bannedAt(user.getBannedAt())
            .banReason(user.getBanReason())
            .build();
    }
}