package com.churchapp.dto;

import com.churchapp.entity.Resource;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
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
    
    public ResourceResponse(UUID id, String title, String description, Resource.ResourceCategory category,
                           String fileName, String fileUrl, Long fileSize, String fileType,
                           UUID uploadedById, String uploaderName, String uploaderProfilePicUrl,
                           String youtubeUrl, String youtubeVideoId, String youtubeTitle, 
                           String youtubeThumbnailUrl, String youtubeDuration, String youtubeChannel,
                           Boolean isApproved, Integer downloadCount, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.fileType = fileType;
        this.uploadedById = uploadedById;
        this.uploaderName = uploaderName;
        this.uploaderProfilePicUrl = uploaderProfilePicUrl;
        this.youtubeUrl = youtubeUrl;
        this.youtubeVideoId = youtubeVideoId;
        this.youtubeTitle = youtubeTitle;
        this.youtubeThumbnailUrl = youtubeThumbnailUrl;
        this.youtubeDuration = youtubeDuration;
        this.youtubeChannel = youtubeChannel;
        this.isApproved = isApproved;
        this.downloadCount = downloadCount;
        this.createdAt = createdAt;
    }
    
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