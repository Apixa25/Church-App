package com.churchapp.dto;

import com.churchapp.entity.User;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserProfileRequest {
    
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;
    
    @Size(max = 1000, message = "Bio must be less than 1000 characters")
    private String bio;
    
    private User.UserRole role;
    
    private String profilePicUrl;
}