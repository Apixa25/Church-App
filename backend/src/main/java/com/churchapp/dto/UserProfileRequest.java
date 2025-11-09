package com.churchapp.dto;

import com.churchapp.entity.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.math.BigDecimal;

@Data
public class UserProfileRequest {
    
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;
    
    @Size(max = 1000, message = "Bio must be less than 1000 characters")
    private String bio;
    
    @Size(max = 255, message = "Location must be less than 255 characters")
    private String location;
    
    @Size(max = 500, message = "Website must be less than 500 characters")
    private String website;
    
    private String interests; // JSON string of interests array
    
    @Size(max = 20, message = "Phone number must be less than 20 characters")
    private String phoneNumber;
    
    @NotBlank(message = "Address line 1 is required")
    @Size(max = 255, message = "Address line 1 must be less than 255 characters")
    private String addressLine1;

    @Size(max = 255, message = "Address line 2 must be less than 255 characters")
    private String addressLine2;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must be less than 100 characters")
    private String city;

    @NotBlank(message = "State or province is required")
    @Size(max = 100, message = "State or province must be less than 100 characters")
    private String stateProvince;

    @NotBlank(message = "Postal code is required")
    @Size(max = 20, message = "Postal code must be less than 20 characters")
    @Pattern(regexp = "^[\\w\\s-]*$", message = "Postal code contains invalid characters")
    private String postalCode;

    @NotBlank(message = "Country is required")
    @Size(max = 100, message = "Country must be less than 100 characters")
    private String country;

    private BigDecimal latitude;

    private BigDecimal longitude;

    @Size(max = 50, message = "Geocode status must be less than 50 characters")
    private String geocodeStatus;
    
    private LocalDate birthday;
    
    @Size(max = 255, message = "Spiritual gift must be less than 255 characters")
    private String spiritualGift;
    
    @Size(max = 255, message = "Equipping gifts must be less than 255 characters")
    private String equippingGifts;
    
    private User.Role role;
    
    private String profilePicUrl;
    
    private String bannerImageUrl;
}