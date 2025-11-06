package com.churchapp.dto;

import com.churchapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
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
    private String location;
    private String website;
    private String interests; // JSON string of interests array
    private String phoneNumber;
    private String address;
    private LocalDate birthday;
    private String spiritualGift;
    private User.Role role;
    private String profilePicUrl;
    private String bannerImageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLogin;
    
    public static UserProfileResponse fromUser(User user) {
        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getBio(),
            user.getLocation(),
            user.getWebsite(),
            user.getInterests(),
            user.getPhoneNumber(),
            user.getAddress(),
            user.getBirthday(),
            user.getSpiritualGift(),
            user.getRole(),
            user.getProfilePicUrl(),
            user.getBannerImageUrl(),
            user.getCreatedAt(),
            user.getUpdatedAt(),
            user.getLastLogin()
        );
    }
}