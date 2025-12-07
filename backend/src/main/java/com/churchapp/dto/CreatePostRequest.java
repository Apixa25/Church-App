package com.churchapp.dto;

import com.churchapp.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreatePostRequest {

    @Size(max = 2000, message = "Post content cannot exceed 2000 characters")
    private String content;

    private List<String> mediaUrls;

    private List<String> mediaTypes;

    private Post.PostType postType = Post.PostType.GENERAL;

    private String category;

    private String location;

    private boolean anonymous = false;

    // Multi-tenant fields
    private UUID organizationId;  // Optional: explicitly set post to specific organization

    private UUID groupId;          // Optional: post to specific group

    // Social media embed fields
    private String externalUrl;    // Optional: URL of social media content to embed (X, Facebook, Instagram, YouTube)

    public boolean isAnonymous() {
        return anonymous;
    }

    public void setAnonymous(boolean anonymous) {
        this.anonymous = anonymous;
    }
}
