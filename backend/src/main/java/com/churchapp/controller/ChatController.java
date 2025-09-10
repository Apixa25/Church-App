package com.churchapp.controller;

import com.churchapp.dto.*;
import com.churchapp.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class ChatController {
    
    private final ChatService chatService;
    
    // ==================== CHAT GROUP ENDPOINTS ====================
    
    @GetMapping("/groups")
    public ResponseEntity<List<ChatGroupResponse>> getUserChatGroups(@AuthenticationPrincipal User user) {
        try {
            List<ChatGroupResponse> groups = chatService.getUserChatGroups(user.getUsername());
            return ResponseEntity.ok(groups);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/groups/joinable")
    public ResponseEntity<List<ChatGroupResponse>> getJoinableGroups(@AuthenticationPrincipal User user) {
        try {
            List<ChatGroupResponse> groups = chatService.getJoinableGroups(user.getUsername());
            return ResponseEntity.ok(groups);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/groups")
    public ResponseEntity<?> createChatGroup(@AuthenticationPrincipal User user,
                                           @Valid @RequestBody ChatGroupRequest request) {
        try {
            ChatGroupResponse group = chatService.createChatGroup(user.getUsername(), request);
            return ResponseEntity.ok(group);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/groups/{groupId}/join")
    public ResponseEntity<?> joinChatGroup(@AuthenticationPrincipal User user,
                                         @PathVariable UUID groupId) {
        try {
            ChatGroupResponse group = chatService.joinChatGroup(user.getUsername(), groupId);
            return ResponseEntity.ok(group);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/groups/{groupId}/leave")
    public ResponseEntity<?> leaveChatGroup(@AuthenticationPrincipal User user,
                                          @PathVariable UUID groupId) {
        try {
            chatService.leaveChatGroup(user.getUsername(), groupId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Successfully left the group");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // ==================== MESSAGE ENDPOINTS ====================
    
    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<Page<MessageResponse>> getGroupMessages(
            @AuthenticationPrincipal User user,
            @PathVariable UUID groupId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        try {
            Page<MessageResponse> messages = chatService.getGroupMessages(
                user.getUsername(), groupId, page, size);
            return ResponseEntity.ok(messages);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/messages")
    public ResponseEntity<?> sendMessage(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody MessageRequest request) {
        try {
            MessageResponse message = chatService.sendMessage(user.getUsername(), request);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/messages/media")
    public ResponseEntity<?> sendMediaMessage(@AuthenticationPrincipal User user,
                                            @RequestParam("groupId") UUID groupId,
                                            @RequestParam("file") MultipartFile file,
                                            @RequestParam(value = "content", required = false) String content,
                                            @RequestParam(value = "parentMessageId", required = false) UUID parentMessageId,
                                            @RequestParam(value = "tempId", required = false) String tempId) {
        try {
            // This would integrate with your FileUploadService to upload the media
            // For now, we'll create a placeholder implementation
            
            MessageRequest request = new MessageRequest();
            request.setChatGroupId(groupId);
            request.setContent(content);
            request.setParentMessageId(parentMessageId);
            request.setTempId(tempId);
            
            // Determine message type from file
            String contentType = file.getContentType();
            if (contentType.startsWith("image/")) {
                request.setMessageType(com.churchapp.entity.Message.MessageType.IMAGE);
            } else if (contentType.startsWith("video/")) {
                request.setMessageType(com.churchapp.entity.Message.MessageType.VIDEO);
            } else if (contentType.startsWith("audio/")) {
                request.setMessageType(com.churchapp.entity.Message.MessageType.AUDIO);
            } else {
                request.setMessageType(com.churchapp.entity.Message.MessageType.DOCUMENT);
            }
            
            // TODO: Upload file and set URL
            request.setMediaUrl("https://placeholder.com/" + file.getOriginalFilename());
            request.setMediaType(contentType);
            request.setMediaFilename(file.getOriginalFilename());
            request.setMediaSize(file.getSize());
            
            MessageResponse message = chatService.sendMessage(user.getUsername(), request);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/messages/{messageId}")
    public ResponseEntity<?> editMessage(@AuthenticationPrincipal User user,
                                       @PathVariable UUID messageId,
                                       @RequestBody Map<String, String> request) {
        try {
            String newContent = request.get("content");
            if (newContent == null || newContent.trim().isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Message content is required");
                return ResponseEntity.badRequest().body(error);
            }
            
            MessageResponse message = chatService.editMessage(user.getUsername(), messageId, newContent);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/messages/{messageId}")
    public ResponseEntity<?> deleteMessage(@AuthenticationPrincipal User user,
                                         @PathVariable UUID messageId) {
        try {
            chatService.deleteMessage(user.getUsername(), messageId);
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
    public ResponseEntity<?> markMessagesAsRead(@AuthenticationPrincipal User user,
                                              @PathVariable UUID groupId,
                                              @RequestBody(required = false) Map<String, Object> request) {
        try {
            LocalDateTime timestamp = LocalDateTime.now();
            if (request != null && request.containsKey("timestamp")) {
                // Parse timestamp from request if provided
                timestamp = LocalDateTime.parse(request.get("timestamp").toString());
            }
            
            chatService.markMessagesAsRead(user.getUsername(), groupId, timestamp);
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
            @AuthenticationPrincipal User user,
            @PathVariable UUID groupId) {
        try {
            List<ChatGroupMemberResponse> members = chatService.getGroupMembers(user.getUsername(), groupId);
            return ResponseEntity.ok(members);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/groups/{groupId}/members/{memberId}/role")
    public ResponseEntity<?> updateMemberRole(@AuthenticationPrincipal User user,
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
            
            chatService.updateMemberRole(user.getUsername(), groupId, memberId, newRole);
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
    public ResponseEntity<ChatSearchResponse> searchMessages(@AuthenticationPrincipal User user,
                                                           @Valid @RequestBody ChatSearchRequest request) {
        try {
            ChatSearchResponse results = chatService.searchMessages(user.getUsername(), request);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<ChatSearchResponse> searchMessagesGet(@AuthenticationPrincipal User user,
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
            
            ChatSearchResponse results = chatService.searchMessages(user.getUsername(), request);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // ==================== UTILITY ENDPOINTS ====================
    
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getChatStatus(@AuthenticationPrincipal User user) {
        try {
            Map<String, Object> status = new HashMap<>();
            status.put("userEmail", user.getUsername());
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
}