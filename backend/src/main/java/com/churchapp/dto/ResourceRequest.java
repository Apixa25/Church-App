package com.churchapp.dto;

import com.churchapp.entity.Resource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResourceRequest {
    
    @NotBlank(message = "Resource title is required")
    @Size(min = 3, max = 200, message = "Resource title must be between 3 and 200 characters")
    private String title;
    
    @Size(max = 2000, message = "Resource description cannot exceed 2000 characters")
    private String description;
    
    private Resource.ResourceCategory category = Resource.ResourceCategory.GENERAL;
    
    // File-related fields (will be null for text-only resources)
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileType;
}