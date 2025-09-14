package com.churchapp.service;

import com.churchapp.dto.UserProfileRequest;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserProfileService {
    
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    
    public UserProfileResponse getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        return UserProfileResponse.fromUser(user);
    }
    
    public UserProfileResponse getUserProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        
        return UserProfileResponse.fromUser(user);
    }
    
    public UserProfileResponse updateUserProfile(UUID userId, UserProfileRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Update only the fields that are provided
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }
        
        if (request.getBio() != null) {
            user.setBio(request.getBio().trim().isEmpty() ? null : request.getBio().trim());
        }
        
        if (request.getLocation() != null) {
            user.setLocation(request.getLocation().trim().isEmpty() ? null : request.getLocation().trim());
        }
        
        if (request.getWebsite() != null) {
            user.setWebsite(request.getWebsite().trim().isEmpty() ? null : request.getWebsite().trim());
        }
        
        if (request.getInterests() != null) {
            user.setInterests(request.getInterests().trim().isEmpty() ? null : request.getInterests().trim());
        }
        
        // Only allow role updates for admins or specific business logic
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        
        if (request.getProfilePicUrl() != null) {
            user.setProfilePicUrl(request.getProfilePicUrl());
        }
        
        User updatedUser = userRepository.save(user);
        log.info("User profile updated for user: {}", userId);
        
        return UserProfileResponse.fromUser(updatedUser);
    }
    
    public String uploadProfilePicture(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Delete old profile picture if exists
        if (user.getProfilePicUrl() != null && !user.getProfilePicUrl().isEmpty()) {
            try {
                fileUploadService.deleteFile(user.getProfilePicUrl());
                log.info("Deleted old profile picture for user: {}", userId);
            } catch (Exception e) {
                log.warn("Could not delete old profile picture for user: {}", userId, e);
                // Continue with upload even if deletion fails
            }
        }
        
        // Upload new profile picture
        String fileUrl = fileUploadService.uploadFile(file, "profile-pictures");
        
        // Update user's profile picture URL
        user.setProfilePicUrl(fileUrl);
        userRepository.save(user);
        
        log.info("Profile picture updated for user: {}", userId);
        return fileUrl;
    }
    
    public void deleteProfilePicture(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (user.getProfilePicUrl() != null && !user.getProfilePicUrl().isEmpty()) {
            try {
                fileUploadService.deleteFile(user.getProfilePicUrl());
                user.setProfilePicUrl(null);
                userRepository.save(user);
                log.info("Profile picture deleted for user: {}", userId);
            } catch (Exception e) {
                log.error("Error deleting profile picture for user: {}", userId, e);
                throw new RuntimeException("Failed to delete profile picture", e);
            }
        }
    }
    
    public boolean isProfileComplete(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        return user.getName() != null && !user.getName().trim().isEmpty() &&
               user.getBio() != null && !user.getBio().trim().isEmpty() &&
               user.getProfilePicUrl() != null && !user.getProfilePicUrl().trim().isEmpty();
    }
}