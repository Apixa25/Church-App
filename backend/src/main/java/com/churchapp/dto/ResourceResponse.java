package com.churchapp.dto;

import com.churchapp.entity.Resource;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ResourceResponse {
    
    private UUID id;
    private String title;
    private String description;
    private Resource.ResourceCategory category;
    
    // File details
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileType;
    
    // Uploader details
    private UUID uploadedById;
    private String uploaderName;
    private String uploaderProfilePicUrl;
    
    // YouTube video fields
    private String youtubeUrl;
    private String youtubeVideoId;
    private String youtubeTitle;
    private String youtubeThumbnailUrl;
    private String youtubeDuration;
    private String youtubeChannel;
    
    // Metadata
    private Boolean isApproved;
    private Integer downloadCount;
    private LocalDateTime createdAt;
    
    public static ResourceResponse fromResource(Resource resource) {
        return new ResourceResponse(
            resource.getId(),
            resource.getTitle(),
            resource.getDescription(),
            resource.getCategory(),
            resource.getFileName(),
            resource.getFileUrl(),
            resource.getFileSize(),
            resource.getFileType(),
            resource.getUploadedBy().getId(),
            resource.getUploadedBy().getName(),
            resource.getUploadedBy().getProfilePicUrl(),
            resource.getYoutubeUrl(),
            resource.getYoutubeVideoId(),
            resource.getYoutubeTitle(),
            resource.getYoutubeThumbnailUrl(),
            resource.getYoutubeDuration(),
            resource.getYoutubeChannel(),
            resource.getIsApproved(),
            resource.getDownloadCount(),
            resource.getCreatedAt()
        );
    }
    
    // Public version that hides sensitive info for non-admins
    public static ResourceResponse publicFromResource(Resource resource) {
        ResourceResponse response = fromResource(resource);
        // Hide approval status for public view
        response.setIsApproved(null);
        return response;
    }
}