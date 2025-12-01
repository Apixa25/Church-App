package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PresignedUploadRequest {
    
    @NotBlank(message = "File name is required")
    private String fileName;
    
    @NotBlank(message = "Content type is required")
    private String contentType;
    
    @NotNull(message = "File size is required")
    @Positive(message = "File size must be positive")
    private Long fileSize;
    
    @NotBlank(message = "Folder is required (e.g., 'posts', 'chat-media', 'resources')")
    private String folder;
}

