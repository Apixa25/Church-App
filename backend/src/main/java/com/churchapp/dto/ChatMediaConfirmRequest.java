package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request body for confirming a chat media upload after direct S3 upload
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMediaConfirmRequest {

    private UUID groupId;
    private String s3Key;
    private String filename;
    private String contentType;
    private Long fileSize;
    private String content;  // Optional message text
    private UUID parentMessageId;  // Optional for replies
    private String tempId;  // For optimistic updates
}
