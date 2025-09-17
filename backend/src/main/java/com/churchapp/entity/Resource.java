package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resources", indexes = {
    @Index(name = "idx_resource_uploaded_by", columnList = "uploaded_by"),
    @Index(name = "idx_resource_category", columnList = "category"),
    @Index(name = "idx_resource_created_at", columnList = "created_at"),
    @Index(name = "idx_resource_title", columnList = "title")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Resource {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @NotBlank(message = "Resource title is required")
    @Size(min = 3, max = 200, message = "Resource title must be between 3 and 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Size(max = 2000, message = "Resource description cannot exceed 2000 characters")
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "file_url", length = 1000)
    private String fileUrl;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private ResourceCategory category = ResourceCategory.GENERAL;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false, referencedColumnName = "id")
    private User uploadedBy;
    
    @Column(name = "file_name", length = 500)
    private String fileName;
    
    @Column(name = "file_size")
    private Long fileSize;
    
    @Column(name = "file_type", length = 100)
    private String fileType;
    
    @Column(name = "is_approved", nullable = false)
    private Boolean isApproved = false;
    
    @Column(name = "download_count", nullable = false)
    private Integer downloadCount = 0;
    
    // YouTube video support fields
    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;
    
    @Column(name = "youtube_video_id", length = 50)
    private String youtubeVideoId;
    
    @Column(name = "youtube_title", length = 200)
    private String youtubeTitle;
    
    @Column(name = "youtube_thumbnail_url", length = 1000)
    private String youtubeThumbnailUrl;
    
    @Column(name = "youtube_duration", length = 20)
    private String youtubeDuration;
    
    @Column(name = "youtube_channel", length = 200)
    private String youtubeChannel;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    public enum ResourceCategory {
        GENERAL,
        BIBLE_STUDY,
        DEVOTIONAL,
        SERMON,
        WORSHIP,
        PRAYER,
        YOUTH,
        CHILDREN,
        MENS_MINISTRY,
        WOMENS_MINISTRY,
        SMALL_GROUPS,
        MINISTRY_RESOURCES,
        ANNOUNCEMENTS,
        FORMS,
        POLICIES,
        TRAINING,
        MUSIC,
        AUDIO,
        VIDEO,
        DOCUMENTS,
        IMAGES,
        OTHER
    }
}