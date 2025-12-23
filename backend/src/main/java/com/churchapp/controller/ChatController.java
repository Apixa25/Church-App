package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.ChatService;
import com.churchapp.service.FileUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import com.churchapp.entity.User;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {
    
    private final ChatService chatService;
    private final FileUploadService fileUploadService;
    private final UserRepository userRepository;
    
    // ==================== CHAT GROUP ENDPOINTS ====================
    
    @GetMapping("/groups")
    public ResponseEntity<List<ChatGroupResponse>> getUserChatGroups(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<ChatGroupResponse> groups = chatService.getUserChatGroups(userDetails.getUsername());
            return ResponseEntity.ok(groups);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/groups/joinable")
    public ResponseEntity<List<ChatGroupResponse>> getJoinableGroups(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<ChatGroupResponse> groups = chatService.getJoinableGroups(userDetails.getUsername());
            return ResponseEntity.ok(groups);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/groups")
    public ResponseEntity<?> createChatGroup(@AuthenticationPrincipal UserDetails userDetails,
                                           @Valid @RequestBody ChatGroupRequest request) {
        try {
            ChatGroupResponse group = chatService.createChatGroup(userDetails.getUsername(), request);
            return ResponseEntity.ok(group);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/groups/{groupId}/join")
    public ResponseEntity<?> joinChatGroup(@AuthenticationPrincipal UserDetails userDetails,
                                         @PathVariable UUID groupId) {
        try {
            ChatGroupResponse group = chatService.joinChatGroup(userDetails.getUsername(), groupId);
            return ResponseEntity.ok(group);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/groups/{groupId}/leave")
    public ResponseEntity<?> leaveChatGroup(@AuthenticationPrincipal UserDetails userDetails,
                                          @PathVariable UUID groupId) {
        try {
            chatService.leaveChatGroup(userDetails.getUsername(), groupId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Successfully left the group");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getUsers(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<User> allUsers = userRepository.findAllActiveUsers();
            
            // Filter out current user and convert to response format
            List<Map<String, Object>> userList = allUsers.stream()
                .filter(user -> !user.getEmail().equals(userDetails.getUsername()))
                .map(user -> {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getId().toString());
                    userMap.put("name", user.getName());
                    userMap.put("email", user.getEmail());
                    userMap.put("profilePicUrl", user.getProfilePicUrl());
                    userMap.put("role", user.getRole().name());
                    userMap.put("isOnline", isUserOnline(user));
                    userMap.put("lastSeen", user.getLastLogin() != null ? user.getLastLogin().toString() : null);
                    return userMap;
                })
                .collect(Collectors.toList());
                
            return ResponseEntity.ok(userList);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to fetch users");
            return ResponseEntity.ok(List.of(error));
        }
    }
    
    @PostMapping("/direct-message")
    public ResponseEntity<?> createOrGetDirectMessage(@RequestParam String targetUserEmail, @AuthenticationPrincipal UserDetails userDetails) {
        try {
            ChatGroupResponse directMessage = chatService.createOrGetDirectMessage(userDetails.getUsername(), targetUserEmail);
            return ResponseEntity.ok(directMessage);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ==================== MESSAGE ENDPOINTS ====================
    
    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<Page<MessageResponse>> getGroupMessages(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            Page<MessageResponse> messages = chatService.getGroupMessages(
                userDetails.getUsername(), groupId, page, size);
            return ResponseEntity.ok(messages);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/messages")
    public ResponseEntity<?> sendMessage(@AuthenticationPrincipal UserDetails userDetails,
                                       @Valid @RequestBody MessageRequest request) {
        try {
            MessageResponse message = chatService.sendMessage(userDetails.getUsername(), request);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ==================== PRESIGNED URL UPLOAD (Modern Approach - Like X.com/Facebook) ====================

    /**
     * Generate presigned URL for direct S3 upload (bypasses nginx completely)
     * Step 1: Frontend calls this to get a presigned URL
     * Step 2: Frontend uploads directly to S3 using the presigned URL
     * Step 3: Frontend calls /messages/media/confirm to create the message
     */
    @PostMapping("/messages/media/presign")
    public ResponseEntity<?> generateChatMediaUploadUrl(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("groupId") UUID groupId,
            @RequestParam("filename") String filename,
            @RequestParam("contentType") String contentType,
            @RequestParam("size") Long size) {
        try {
            // Verify user has access to this group
            chatService.verifyGroupAccess(userDetails.getUsername(), groupId);

            log.info("Generating presigned URL for chat media: user={}, group={}, file={}, size={}",
                    userDetails.getUsername(), groupId, filename, size);

            // Generate presigned URL using existing service
            PresignedUploadResponse response = fileUploadService.generatePresignedUploadUrl(
                    filename, contentType, size, "chat-media");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid chat media upload request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            log.error("Error generating presigned URL for chat media", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Confirm upload and create message after direct S3 upload completes
     * Called by frontend after successfully uploading to S3 using presigned URL
     */
    @PostMapping("/messages/media/confirm")
    public ResponseEntity<?> confirmChatMediaUpload(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChatMediaConfirmRequest request) {
        try {
            // Verify user has access to this group
            chatService.verifyGroupAccess(userDetails.getUsername(), request.getGroupId());

            log.info("Confirming chat media upload: user={}, group={}, s3Key={}",
                    userDetails.getUsername(), request.getGroupId(), request.getS3Key());

            // Build the final URL from S3 key
            String mediaUrl = fileUploadService.generateAccessibleUrl(request.getS3Key());

            // Create message request
            MessageRequest messageRequest = new MessageRequest();
            messageRequest.setChatGroupId(request.getGroupId());
            messageRequest.setContent(request.getContent());
            messageRequest.setParentMessageId(request.getParentMessageId());
            messageRequest.setTempId(request.getTempId());
            messageRequest.setMediaUrl(mediaUrl);
            messageRequest.setMediaType(request.getContentType());
            messageRequest.setMediaFilename(request.getFilename());
            messageRequest.setMediaSize(request.getFileSize());

            // Determine message type from content type
            String contentType = request.getContentType();
            if (contentType != null && contentType.startsWith("image/")) {
                messageRequest.setMessageType(com.churchapp.entity.Message.MessageType.IMAGE);
            } else if (contentType != null && contentType.startsWith("video/")) {
                messageRequest.setMessageType(com.churchapp.entity.Message.MessageType.VIDEO);
            } else if (contentType != null && contentType.startsWith("audio/")) {
                messageRequest.setMessageType(com.churchapp.entity.Message.MessageType.AUDIO);
            } else {
                messageRequest.setMessageType(com.churchapp.entity.Message.MessageType.DOCUMENT);
            }

            MessageResponse message = chatService.sendMessage(userDetails.getUsername(), messageRequest);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            log.error("Error confirming chat media upload", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== LEGACY MEDIA UPLOAD (Kept for backward compatibility) ====================

    @PostMapping("/messages/media")
    public ResponseEntity<?> sendMediaMessage(@AuthenticationPrincipal UserDetails userDetails,
                                            @RequestParam("groupId") UUID groupId,
                                            @RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "content", required = false) String content,
                                            @RequestParam(value = "parentMessageId", required = false) UUID parentMessageId,
                                            @RequestParam(value = "tempId", required = false) String tempId) {
        try {
            // Validate file before upload
            if (file.isEmpty()) {
                Map<String, String> error = Map.of("error", "File is empty");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Upload file to S3 using FileUploadService
            String mediaUrl;
            try {
                mediaUrl = fileUploadService.uploadFile(file, "chat-media");
            } catch (Exception e) {
                log.error("Error uploading file to S3", e);
                Map<String, String> error = Map.of("error", "Failed to upload file: " + e.getMessage());
                return ResponseEntity.status(500).body(error);
            }
            
            MessageRequest request = new MessageRequest();
            request.setChatGroupId(groupId);
            request.setContent(content);
            request.setParentMessageId(parentMessageId);
            request.setTempId(tempId);
            
            // Determine message type from file
            String contentType = file.getContentType();
            if (contentType != null && contentType.startsWith("image/")) {
                request.setMessageType(com.churchapp.entity.Message.MessageType.IMAGE);
            } else if (contentType != null && contentType.startsWith("video/")) {
                request.setMessageType(com.churchapp.entity.Message.MessageType.VIDEO);
            } else if (contentType != null && contentType.startsWith("audio/")) {
                request.setMessageType(com.churchapp.entity.Message.MessageType.AUDIO);
            } else {
                request.setMessageType(com.churchapp.entity.Message.MessageType.DOCUMENT);
            }
            
            // Set uploaded file URL and metadata
            request.setMediaUrl(mediaUrl);
            request.setMediaType(contentType);
            request.setMediaFilename(file.getOriginalFilename());
            request.setMediaSize(file.getSize());
            
            MessageResponse message = chatService.sendMessage(userDetails.getUsername(), request);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/messages/{messageId}")
    public ResponseEntity<?> editMessage(@AuthenticationPrincipal UserDetails userDetails,
                                       @PathVariable UUID messageId,
                                       @RequestBody Map<String, String> request) {
        try {
            String newContent = request.get("content");
            if (newContent == null || newContent.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Message content is required");
                return ResponseEntity.badRequest().body(error);
            }
            
            MessageResponse message = chatService.editMessage(userDetails.getUsername(), messageId, newContent);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(@AuthenticationPrincipal UserDetails userDetails,
                                         @PathVariable UUID messageId) {
        try {
            chatService.deleteMessage(userDetails.getUsername(), messageId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Message deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/groups/{groupId}/mark-read")
    public ResponseEntity<?> markMessagesAsRead(@AuthenticationPrincipal UserDetails userDetails,
                                              @PathVariable UUID groupId,
                                              @RequestBody(required = false) Map<String, Object> request) {
        try {
            LocalDateTime timestamp = LocalDateTime.now();
            if (request != null && request.containsKey("timestamp")) {
                // Parse timestamp from request if provided
                timestamp = LocalDateTime.parse(request.get("timestamp").toString());
            }
            
            chatService.markMessagesAsRead(userDetails.getUsername(), groupId, timestamp);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Messages marked as read");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ==================== MEMBER MANAGEMENT ENDPOINTS ====================
    
    @GetMapping("/groups/{groupId}/members")
    public ResponseEntity<List<ChatGroupMemberResponse>> getGroupMembers(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID groupId) {
        try {
            List<ChatGroupMemberResponse> members = chatService.getGroupMembers(userDetails.getUsername(), groupId);
            return ResponseEntity.ok(members);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/groups/{groupId}/members/{memberId}/role")
    public ResponseEntity<?> updateMemberRole(@AuthenticationPrincipal UserDetails userDetails,
                                            @PathVariable UUID groupId,
                                            @PathVariable UUID memberId,
                                            @RequestBody Map<String, String> request) {
        try {
            String newRole = request.get("role");
            if (newRole == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Role is required");
                return ResponseEntity.badRequest().body(error);
            }
            
            chatService.updateMemberRole(userDetails.getUsername(), groupId, memberId, newRole);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Member role updated successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ==================== SEARCH ENDPOINTS ====================
    
    @PostMapping("/search")
    public ResponseEntity<ChatSearchResponse> searchMessages(@AuthenticationPrincipal UserDetails userDetails,
                                                           @Valid @RequestBody ChatSearchRequest request) {
        try {
            ChatSearchResponse results = chatService.searchMessages(userDetails.getUsername(), request);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<ChatSearchResponse> searchMessagesGet(@AuthenticationPrincipal UserDetails userDetails,
                                                              @RequestParam String query,
                                                              @RequestParam(required = false) List<UUID> groupIds,
                                                              @RequestParam(defaultValue = "50") int limit,
                                                              @RequestParam(defaultValue = "0") int offset) {
        try {
            ChatSearchRequest request = new ChatSearchRequest();
            request.setQuery(query);
            request.setChatGroupIds(groupIds);
            request.setLimit(limit);
            request.setOffset(offset);
            
            ChatSearchResponse results = chatService.searchMessages(userDetails.getUsername(), request);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // ==================== UTILITY ENDPOINTS ====================
    
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getChatStatus(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            Map<String, Object> status = new HashMap<>();
            status.put("userEmail", userDetails.getUsername());
            status.put("timestamp", LocalDateTime.now());
            status.put("chatServiceStatus", "active");
            status.put("webSocketEnabled", true);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/groups/types")
    public ResponseEntity<List<Map<String, String>>> getGroupTypes() {
        try {
            List<Map<String, String>> types = List.of(
                createGroupType("MAIN", "Church-wide Main Chat"),
                createGroupType("SUBGROUP", "Specialized Subgroup"),
                createGroupType("PRIVATE", "Private Group"),
                createGroupType("PRAYER", "Prayer Group"),
                createGroupType("MINISTRY", "Ministry Group"),
                createGroupType("STUDY", "Bible Study Group"),
                createGroupType("YOUTH", "Youth Group"),
                createGroupType("MENS", "Men's Group"),
                createGroupType("WOMENS", "Women's Group")
            );
            return ResponseEntity.ok(types);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    private Map<String, String> createGroupType(String value, String label) {
        Map<String, String> type = new HashMap<>();
        type.put("value", value);
        type.put("label", label);
        return type;
    }
    
    private boolean isUserOnline(User user) {
        // This would typically check against a Redis cache or session store
        // For now, return a simple heuristic based on last login
        return user.getLastLogin() != null && 
               user.getLastLogin().isAfter(java.time.LocalDateTime.now().minusMinutes(5));
    }
}