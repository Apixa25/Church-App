package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class FileUploadResponse {
    
    private String fileUrl;
    private String message;
    private boolean success;
    
    public static FileUploadResponse success(String fileUrl) {
        return new FileUploadResponse(fileUrl, "File uploaded successfully", true);
    }
    
    public static FileUploadResponse error(String message) {
        return new FileUploadResponse(null, message, false);
    }
}