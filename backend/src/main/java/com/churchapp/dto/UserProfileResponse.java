package com.churchapp.dto;

import com.churchapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
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
    private String addressLine1;
    private String addressLine2;
    private String city;
    private String stateProvince;
    private String postalCode;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String geocodeStatus;
    private LocalDate birthday;
    private String spiritualGift;
    private String equippingGifts;
    private User.Role role;
    private String profilePicUrl;
    private String bannerImageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastLogin;
    
    // Social stats
    private Long followerCount;
    private Long followingCount;
    
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
            user.getAddressLine1(),
            user.getAddressLine2(),
            user.getCity(),
            user.getStateProvince(),
            user.getPostalCode(),
            user.getCountry(),
            user.getLatitude(),
            user.getLongitude(),
            user.getGeocodeStatus(),
            user.getBirthday(),
            user.getSpiritualGift(),
            user.getEquippingGifts(),
            user.getRole(),
            user.getProfilePicUrl(),
            user.getBannerImageUrl(),
            user.getCreatedAt(),
            user.getUpdatedAt(),
            user.getLastLogin(),
            null, // followerCount will be set by service
            null  // followingCount will be set by service
        );
    }
}