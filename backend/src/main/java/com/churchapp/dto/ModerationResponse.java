package com.churchapp.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationResponse {
    private UUID id;
    private String contentType; // POST, PRAYER, ANNOUNCEMENT, MESSAGE, etc.
    private UUID contentId;
    private String contentPreview;
    private String contentAuthor;
    private UUID contentAuthorId;

    // Report details
    private String reportReason;
    private String reportDescription;
    private String reportedBy;
    private UUID reporterId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime reportedAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    // Moderation status
    private String status; // PENDING, APPROVED, REMOVED, HIDDEN, WARNED
    private String priority; // LOW, MEDIUM, HIGH, URGENT
    private boolean isAutoFlagged;
    private String autoFlagReason;

    // Resolution details
    private String moderationAction;
    private String moderationReason;
    private String moderatedBy;
    private UUID moderatorId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime moderatedAt;

    // Additional metadata
    private int reportCount; // How many times this content has been reported
    private boolean isVisible; // Whether content is currently visible to users
    private String category;
}