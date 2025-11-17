package com.churchapp.controller;

import com.churchapp.dto.FileUploadResponse;
import com.churchapp.dto.UserProfileRequest;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.ProfileView;
import com.churchapp.entity.UserBlock;
import com.churchapp.entity.UserFollow;
import com.churchapp.security.JwtUtil;
import com.churchapp.service.ProfileAnalyticsService;
import com.churchapp.service.FollowerAnalyticsService;
import com.churchapp.service.UserBlockService;
import com.churchapp.service.UserFollowService;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class UserProfileController {
    
    private final UserProfileService userProfileService;
    private final UserFollowService userFollowService;
    private final UserBlockService userBlockService;
    private final ProfileAnalyticsService profileAnalyticsService;
    private final FollowerAnalyticsService followerAnalyticsService;
    private final JwtUtil jwtUtil;
    
    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse profile = userProfileService.getUserProfileByEmail(user.getUsername());
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/{userId}")
    public ResponseEntity<UserProfileResponse> getUserProfile(@PathVariable UUID userId) {
        try {
            UserProfileResponse profile = userProfileService.getUserProfile(userId);
            return ResponseEntity.ok(profile);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@AuthenticationPrincipal User user,
                                           @Valid @RequestBody UserProfileRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            UserProfileResponse updatedProfile = userProfileService.updateUserProfile(
                currentProfile.getUserId(), request);
            return ResponseEntity.ok(updatedProfile);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/me/upload-picture")
    public ResponseEntity<?> uploadProfilePicture(@AuthenticationPrincipal User user,
                                                 @RequestParam("file") MultipartFile file) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            String fileUrl = userProfileService.uploadProfilePicture(currentProfile.getUserId(), file);
            return ResponseEntity.ok(FileUploadResponse.success(fileUrl));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(FileUploadResponse.error(e.getMessage()));
        }
    }
    
    @DeleteMapping("/me/delete-picture")
    public ResponseEntity<?> deleteProfilePicture(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            userProfileService.deleteProfilePicture(currentProfile.getUserId());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Profile picture deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping("/me/upload-banner")
    public ResponseEntity<?> uploadBannerImage(@AuthenticationPrincipal User user,
                                              @RequestParam("file") MultipartFile file) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            String fileUrl = userProfileService.uploadBannerImage(currentProfile.getUserId(), file);
            return ResponseEntity.ok(FileUploadResponse.success(fileUrl));
        } catch (Exception e) {
            log.error("Error uploading banner image for user: {}", user.getUsername(), e);
            return ResponseEntity.badRequest().body(FileUploadResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/me/complete-status")
    public ResponseEntity<?> getProfileCompletionStatus(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            boolean isComplete = userProfileService.isProfileComplete(currentProfile.getUserId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("isComplete", isComplete);
            response.put("userId", currentProfile.getUserId());
            response.put("profileCompletionPercentage", calculateCompletionPercentage(currentProfile));
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<Page<UserProfileResponse>> searchUsers(
            @AuthenticationPrincipal User user,
            @RequestParam String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            Pageable pageable = PageRequest.of(page, size);
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            // Pass searcher's user ID to filter out blocked users
            Page<UserProfileResponse> users = userProfileService.searchUsers(query, currentProfile.getUserId(), pageable);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Error searching users: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    // ========================================================================
    // FOLLOW/UNFOLLOW ENDPOINTS
    // ========================================================================

    /**
     * Follow a user
     * POST /api/profile/users/{userId}/follow
     */
    @PostMapping("/users/{userId}/follow")
    public ResponseEntity<?> followUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            userFollowService.followUser(currentProfile.getUserId(), userId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Successfully followed user");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Unfollow a user
     * DELETE /api/users/{userId}/follow
     */
    @DeleteMapping("/users/{userId}/follow")
    public ResponseEntity<?> unfollowUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            userFollowService.unfollowUser(currentProfile.getUserId(), userId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Successfully unfollowed user");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Check if current user follows target user
     * GET /api/users/{userId}/follow-status
     */
    @GetMapping("/users/{userId}/follow-status")
    public ResponseEntity<?> getFollowStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            boolean isFollowing = userFollowService.isFollowing(currentProfile.getUserId(), userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("isFollowing", isFollowing);
            response.put("followerId", currentProfile.getUserId());
            response.put("followingId", userId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get list of users following a specific user (followers)
     * GET /api/users/{userId}/followers
     */
    @GetMapping("/users/{userId}/followers")
    public ResponseEntity<?> getFollowers(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<UserFollow> followers = userFollowService.getFollowers(userId, pageable);
            
            // Convert UserFollow entities to user profile responses
            List<UserProfileResponse> followerProfiles = followers.getContent().stream()
                .map(follow -> {
                    UUID followerId = follow.getId().getFollowerId();
                    return userProfileService.getUserProfile(followerId);
                })
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", followerProfiles);
            response.put("totalElements", followers.getTotalElements());
            response.put("totalPages", followers.getTotalPages());
            response.put("currentPage", followers.getNumber());
            response.put("size", followers.getSize());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get list of users that a specific user is following
     * GET /api/users/{userId}/following
     */
    @GetMapping("/users/{userId}/following")
    public ResponseEntity<?> getFollowing(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<UserFollow> following = userFollowService.getFollowing(userId, pageable);
            
            // Convert UserFollow entities to user profile responses
            List<UserProfileResponse> followingProfiles = following.getContent().stream()
                .map(follow -> {
                    UUID followingId = follow.getId().getFollowingId();
                    return userProfileService.getUserProfile(followingId);
                })
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", followingProfiles);
            response.put("totalElements", following.getTotalElements());
            response.put("totalPages", following.getTotalPages());
            response.put("currentPage", following.getNumber());
            response.put("size", following.getSize());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // ========================================================================
    // BLOCK/UNBLOCK ENDPOINTS
    // ========================================================================

    /**
     * Block a user
     * POST /api/profile/users/{userId}/block
     */
    @PostMapping("/users/{userId}/block")
    public ResponseEntity<?> blockUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            userBlockService.blockUser(currentProfile.getUserId(), userId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "User blocked successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Unblock a user
     * DELETE /api/profile/users/{userId}/block
     */
    @DeleteMapping("/users/{userId}/block")
    public ResponseEntity<?> unblockUser(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            userBlockService.unblockUser(currentProfile.getUserId(), userId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "User unblocked successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Check if current user blocks target user
     * GET /api/profile/users/{userId}/block-status
     */
    @GetMapping("/users/{userId}/block-status")
    public ResponseEntity<?> getBlockStatus(
            @AuthenticationPrincipal User user,
            @PathVariable UUID userId) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            boolean isBlocked = userBlockService.isBlocked(currentProfile.getUserId(), userId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("isBlocked", isBlocked);
            response.put("blockerId", currentProfile.getUserId());
            response.put("blockedId", userId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get list of users blocked by current user
     * GET /api/profile/me/blocked
     */
    @GetMapping("/me/blocked")
    public ResponseEntity<?> getBlockedUsers(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Pageable pageable = PageRequest.of(page, size);
            Page<UserBlock> blockedUsers = userBlockService.getBlockedUsers(currentProfile.getUserId(), pageable);
            
            // Convert UserBlock entities to user profile responses
            List<UserProfileResponse> blockedProfiles = blockedUsers.getContent().stream()
                .map(block -> {
                    UUID blockedId = block.getId().getBlockedId();
                    return userProfileService.getUserProfile(blockedId);
                })
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", blockedProfiles);
            response.put("totalElements", blockedUsers.getTotalElements());
            response.put("totalPages", blockedUsers.getTotalPages());
            response.put("currentPage", blockedUsers.getNumber());
            response.put("size", blockedUsers.getSize());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // ========================================================================
    // ANALYTICS ENDPOINTS
    // ========================================================================

    /**
     * Get profile views for current user (only visible to profile owner)
     * GET /api/profile/me/views
     */
    @GetMapping("/me/views")
    public ResponseEntity<?> getMyProfileViews(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Pageable pageable = PageRequest.of(page, size);
            Page<ProfileView> profileViews = profileAnalyticsService.getProfileViews(currentProfile.getUserId(), pageable);
            
            // Convert to response with viewer profile info
            List<Map<String, Object>> viewsList = profileViews.getContent().stream()
                .map(view -> {
                    UserProfileResponse viewerProfile = userProfileService.getUserProfile(view.getViewerId());
                    Map<String, Object> viewData = new HashMap<>();
                    viewData.put("id", view.getId());
                    viewData.put("viewer", viewerProfile);
                    viewData.put("viewedAt", view.getViewedAt());
                    return viewData;
                })
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", viewsList);
            response.put("totalElements", profileViews.getTotalElements());
            response.put("totalPages", profileViews.getTotalPages());
            response.put("currentPage", profileViews.getNumber());
            response.put("size", profileViews.getSize());
            
            // Add summary stats
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalViews", profileAnalyticsService.getTotalProfileViews(currentProfile.getUserId()));
            stats.put("viewsToday", profileAnalyticsService.getProfileViewsInPeriod(currentProfile.getUserId(), 1));
            stats.put("viewsThisWeek", profileAnalyticsService.getProfileViewsInPeriod(currentProfile.getUserId(), 7));
            stats.put("viewsThisMonth", profileAnalyticsService.getProfileViewsInPeriod(currentProfile.getUserId(), 30));
            stats.put("uniqueViewers", profileAnalyticsService.getUniqueViewersCount(currentProfile.getUserId()));
            response.put("stats", stats);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching profile views: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch profile views");
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Get follower growth analytics
     * GET /api/profile/me/follower-growth
     */
    @GetMapping("/me/follower-growth")
    public ResponseEntity<?> getFollowerGrowth(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "30") int days) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Create snapshot if it doesn't exist for today
            followerAnalyticsService.createSnapshot(currentProfile.getUserId());
            
            Map<String, Object> growthData = followerAnalyticsService.getFollowerGrowth(currentProfile.getUserId(), days);
            return ResponseEntity.ok(growthData);
        } catch (Exception e) {
            log.error("Error fetching follower growth: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch follower growth");
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    private int calculateCompletionPercentage(UserProfileResponse profile) {
        int completedFields = 0;
        int totalFields = 4; // name, email, bio, profilePicUrl
        
        if (profile.getName() != null && !profile.getName().trim().isEmpty()) completedFields++;
        if (profile.getEmail() != null && !profile.getEmail().trim().isEmpty()) completedFields++;
        if (profile.getBio() != null && !profile.getBio().trim().isEmpty()) completedFields++;
        if (profile.getProfilePicUrl() != null && !profile.getProfilePicUrl().trim().isEmpty()) completedFields++;
        
        return (completedFields * 100) / totalFields;
    }
}