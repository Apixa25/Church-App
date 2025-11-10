package com.churchapp.service;

import com.churchapp.dto.UserProfileRequest;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.User;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.PostShareRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserProfileService {
    
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;
    private final PostRepository postRepository;
    private final PostShareRepository postShareRepository;
    
    public UserProfileResponse getUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        return buildProfileResponse(user);
    }
    
    public UserProfileResponse getUserProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
        
        return buildProfileResponse(user);
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
        
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim().isEmpty() ? null : request.getPhoneNumber().trim());
        }
        
        if (request.getAddressLine1() != null) {
            user.setAddressLine1(request.getAddressLine1().trim());
        }

        if (request.getAddressLine2() != null) {
            user.setAddressLine2(request.getAddressLine2().trim().isEmpty() ? null : request.getAddressLine2().trim());
        }

        if (request.getCity() != null) {
            user.setCity(request.getCity().trim());
        }

        if (request.getStateProvince() != null) {
            user.setStateProvince(request.getStateProvince().trim());
        }

        if (request.getPostalCode() != null) {
            user.setPostalCode(request.getPostalCode().trim());
        }

        if (request.getCountry() != null) {
            user.setCountry(request.getCountry().trim().isEmpty() ? "United States" : request.getCountry().trim());
        }

        if (request.getLatitude() != null) {
            user.setLatitude(request.getLatitude());
        }

        if (request.getLongitude() != null) {
            user.setLongitude(request.getLongitude());
        }

        if (request.getGeocodeStatus() != null) {
            user.setGeocodeStatus(request.getGeocodeStatus().trim().isEmpty() ? null : request.getGeocodeStatus().trim());
        }
        
        if (request.getBirthday() != null) {
            user.setBirthday(request.getBirthday());
        }
        
        if (request.getSpiritualGift() != null) {
            user.setSpiritualGift(request.getSpiritualGift().trim().isEmpty() ? null : request.getSpiritualGift().trim());
        }
        
        if (request.getEquippingGifts() != null) {
            user.setEquippingGifts(request.getEquippingGifts().trim().isEmpty() ? null : request.getEquippingGifts().trim());
        }
        
        // Only allow role updates for admins or specific business logic
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        
        if (request.getProfilePicUrl() != null) {
            user.setProfilePicUrl(request.getProfilePicUrl());
        }
        
        if (request.getBannerImageUrl() != null) {
            user.setBannerImageUrl(request.getBannerImageUrl());
        }
        
        User updatedUser = userRepository.save(user);
        log.info("User profile updated for user: {}", userId);
        
        return buildProfileResponse(updatedUser);
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
    
    public String uploadBannerImage(UUID userId, MultipartFile file) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Delete old banner image if exists
        if (user.getBannerImageUrl() != null && !user.getBannerImageUrl().isEmpty()) {
            try {
                fileUploadService.deleteFile(user.getBannerImageUrl());
                log.info("Deleted old banner image for user: {}", userId);
            } catch (Exception e) {
                log.warn("Could not delete old banner image for user: {}", userId, e);
                // Continue with upload even if deletion fails
            }
        }
        
        // Upload new banner image
        String fileUrl = fileUploadService.uploadFile(file, "banner-images");
        
        // Update user's banner image URL
        user.setBannerImageUrl(fileUrl);
        userRepository.save(user);
        
        log.info("Banner image updated for user: {}", userId);
        return fileUrl;
    }
    
    public boolean isProfileComplete(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        return user.getName() != null && !user.getName().trim().isEmpty() &&
               user.getBio() != null && !user.getBio().trim().isEmpty() &&
               user.getProfilePicUrl() != null && !user.getProfilePicUrl().trim().isEmpty();
    }
    
    public Page<UserProfileResponse> searchUsers(String query, Pageable pageable) {
        Specification<User> spec = createUserSearchSpecification(query);
        Page<User> users = userRepository.findAll(spec, pageable);
        return users.map(this::buildProfileResponse);
    }
    
    private Specification<User> createUserSearchSpecification(String query) {
        return (root, criteriaQuery, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Only show non-deleted, non-banned users
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));
            predicates.add(criteriaBuilder.equal(root.get("isBanned"), false));
            
            if (query != null && !query.trim().isEmpty()) {
                String searchPattern = "%" + query.toLowerCase() + "%";
                Predicate namePredicate = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("name")), searchPattern);
                Predicate emailPredicate = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("email")), searchPattern);
                Predicate bioPredicate = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("bio")), searchPattern);
                predicates.add(criteriaBuilder.or(namePredicate, emailPredicate, bioPredicate));
            }
            
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }

    private UserProfileResponse buildProfileResponse(User user) {
        UserProfileResponse response = UserProfileResponse.fromUser(user);
        long postsCount = postRepository.countByUserId(user.getId());
        long sharesCount = postShareRepository.countByUserId(user.getId());

        response.setPostsCount(postsCount);
        response.setTotalPostShares(sharesCount);

        // Future enhancement: populate followers/following when follow system is active
        return response;
    }
}