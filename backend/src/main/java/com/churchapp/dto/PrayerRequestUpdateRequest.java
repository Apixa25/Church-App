package com.churchapp.dto;

import com.churchapp.entity.PrayerRequest;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PrayerRequestUpdateRequest {
    
    @Size(min = 3, max = 200, message = "Prayer title must be between 3 and 200 characters")
    private String title;
    
    @Size(max = 2000, message = "Prayer description cannot exceed 2000 characters")
    private String description;
    
    private String imageUrl;
    
    private Boolean isAnonymous;
    
    private PrayerRequest.PrayerCategory category;
    
    private PrayerRequest.PrayerStatus status;
}
