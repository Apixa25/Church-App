package com.churchapp.dto;

import com.churchapp.entity.User;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
public class UserManagementResponse {
    private UUID id;
    private String name;
    private String email;
    private String role;
    private String profilePicUrl;
    private String bio;
    
    @JsonProperty("isActive")
    private boolean isActive;
    
    @JsonProperty("isBanned")
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
        // Activity-based status calculation
        // A user is considered ACTIVE if:
        // 1. They are not banned and not soft-deleted
        // 2. AND they meet one of these activity criteria:
        //    - Last login within 30 days, OR
        //    - Never logged in but account created within 30 days (new users)
        //
        // This provides real, meaningful activity data for admin monitoring
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        
        boolean notBannedOrDeleted = !user.isBanned() && user.getDeletedAt() == null;
        boolean hasRecentLogin = user.getLastLogin() != null && user.getLastLogin().isAfter(thirtyDaysAgo);
        boolean isNewUser = user.getLastLogin() == null && user.getCreatedAt().isAfter(thirtyDaysAgo);
        
        boolean isActive = notBannedOrDeleted && (hasRecentLogin || isNewUser);
        
        // Debug logging to understand status calculation
        log.debug("User {} ({}) status calculation: notBanned={}, notDeleted={}, lastLogin={}, createdAt={}, thirtyDaysAgo={}, hasRecentLogin={}, isNewUser={}, FINAL_STATUS={}",
            user.getEmail(), user.getName(),
            !user.isBanned(), user.getDeletedAt() == null,
            user.getLastLogin(), user.getCreatedAt(), thirtyDaysAgo,
            hasRecentLogin, isNewUser, isActive ? "ACTIVE" : "INACTIVE");
        
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