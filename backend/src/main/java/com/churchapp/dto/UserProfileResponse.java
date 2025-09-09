package com.churchapp.dto;

import com.churchapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileResponse {
    
    private UUID userId;
    private String email;
    private String name;
    private String bio;
    private User.UserRole role;
    private String profilePicUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLogin;
    
    public static UserProfileResponse fromUser(User user) {
        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getBio(),
            user.getRole(),
            user.getProfilePicUrl(),
            user.getCreatedAt(),
            user.getUpdatedAt(),
            user.getLastLogin()
        );
    }
}