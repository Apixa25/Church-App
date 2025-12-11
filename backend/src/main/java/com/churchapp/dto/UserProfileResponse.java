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
    
    // Social score - hearts
    private Integer heartsCount;
    private Boolean isLikedByCurrentUser;
    
    public static UserProfileResponse fromUser(User user) {
        // #region agent log
        try {
            java.io.FileWriter fw = new java.io.FileWriter("c:\\Users\\Admin\\Church-App\\Church-App\\.cursor\\debug.log", true);
            String bannerUrl = user.getBannerImageUrl() != null ? user.getBannerImageUrl() : "null";
            String logLine = String.format("{\"location\":\"UserProfileResponse.java:53\",\"message\":\"UserProfileResponse.fromUser - bannerImageUrl from database\",\"data\":{\"userId\":\"%s\",\"bannerImageUrl\":\"%s\",\"bannerImageUrlEmpty\":%s},\"timestamp\":%d,\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"A\"}\n",
                user.getId().toString(), bannerUrl.replace("\"", "\\\""), (user.getBannerImageUrl() == null || user.getBannerImageUrl().trim().isEmpty()), System.currentTimeMillis());
            fw.write(logLine);
            fw.close();
        } catch (Exception e) {}
        // #endregion
        
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
            null, // followingCount will be set by service
            user.getHeartsCount() != null ? user.getHeartsCount() : 0, // heartsCount
            null  // isLikedByCurrentUser will be set by service
        );
    }
}