package com.churchapp.controller;

import com.churchapp.dto.FileUploadResponse;
import com.churchapp.dto.UserProfileRequest;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.security.JwtUtil;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class UserProfileController {
    
    private final UserProfileService userProfileService;
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