package com.churchapp.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class PublicPostResponse {
    UUID id;
    String title;
    String contentPreview;
    String postType;
    String authorName;
    String authorAvatarUrl;
    String heroImageUrl;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    boolean shareable;
}