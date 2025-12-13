package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PresignedUploadResponse {
    
    private String presignedUrl;
    private String s3Key;
    private String fileUrl; // Final URL after upload
    private Long expiresInSeconds;
    
    public static PresignedUploadResponse success(String presignedUrl, String s3Key, String fileUrl, Long expiresInSeconds) {
        return new PresignedUploadResponse(presignedUrl, s3Key, fileUrl, expiresInSeconds);
    }
}

