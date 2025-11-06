package com.churchapp.dto;

import com.churchapp.entity.User;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

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
    
    @Size(max = 500, message = "Address must be less than 500 characters")
    private String address;
    
    private LocalDate birthday;
    
    @Size(max = 255, message = "Spiritual gift must be less than 255 characters")
    private String spiritualGift;
    
    private User.Role role;
    
    private String profilePicUrl;
    
    private String bannerImageUrl;
}