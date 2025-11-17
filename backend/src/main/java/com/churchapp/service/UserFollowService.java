package com.churchapp.service;

import com.churchapp.entity.UserFollow;
import com.churchapp.repository.UserFollowRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserFollowService {

    private final UserFollowRepository userFollowRepository;
    private final UserRepository userRepository;

    /**
     * Follow a user
     * @param followerId The user who wants to follow
     * @param followingId The user to be followed
     * @throws RuntimeException if users are the same or if user doesn't exist
     */
    public void followUser(UUID followerId, UUID followingId) {
        if (followerId.equals(followingId)) {
            throw new RuntimeException("You cannot follow yourself");
        }

        // Verify both users exist
        if (!userRepository.existsById(followerId)) {
            throw new RuntimeException("Follower user not found");
        }
        
        if (!userRepository.existsById(followingId)) {
            throw new RuntimeException("User to follow not found");
        }

        // Check if already following
        if (userFollowRepository.existsById_FollowerIdAndId_FollowingId(followerId, followingId)) {
            log.debug("User {} already follows {}", followerId, followingId);
            return; // Already following, no error
        }

        // Create follow relationship
        UserFollow.UserFollowId followId = new UserFollow.UserFollowId();
        followId.setFollowerId(followerId);
        followId.setFollowingId(followingId);

        UserFollow userFollow = new UserFollow();
        userFollow.setId(followId);

        userFollowRepository.save(userFollow);
        log.info("User {} now follows {}", followerId, followingId);
    }

    /**
     * Unfollow a user
     * @param followerId The user who wants to unfollow
     * @param followingId The user to be unfollowed
     */
    public void unfollowUser(UUID followerId, UUID followingId) {
        if (followerId.equals(followingId)) {
            throw new RuntimeException("You cannot unfollow yourself");
        }

        userFollowRepository.deleteByFollowerIdAndFollowingId(followerId, followingId);
        log.info("User {} unfollowed {}", followerId, followingId);
    }

    /**
     * Check if a user follows another user
     * @param followerId The potential follower
     * @param followingId The potential followee
     * @return true if followerId follows followingId
     */
    public boolean isFollowing(UUID followerId, UUID followingId) {
        return userFollowRepository.existsById_FollowerIdAndId_FollowingId(followerId, followingId);
    }

    /**
     * Get list of users that a user is following
     * @param userId The user ID
     * @param pageable Pagination parameters
     * @return Page of UserFollow relationships
     */
    public Page<UserFollow> getFollowing(UUID userId, Pageable pageable) {
        return userFollowRepository.findById_FollowerIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * Get list of users following a user (followers)
     * @param userId The user ID
     * @param pageable Pagination parameters
     * @return Page of UserFollow relationships
     */
    public Page<UserFollow> getFollowers(UUID userId, Pageable pageable) {
        return userFollowRepository.findById_FollowingIdOrderByCreatedAtDesc(userId, pageable);
    }

    /**
     * Get list of user IDs that a user is following
     * Used for feed queries
     * @param userId The user ID
     * @return List of UUIDs of users being followed
     */
    public List<UUID> getFollowingIds(UUID userId) {
        return userFollowRepository.findFollowingIdsByFollowerId(userId);
    }

    /**
     * Get list of user IDs following a user
     * @param userId The user ID
     * @return List of UUIDs of followers
     */
    public List<UUID> getFollowerIds(UUID userId) {
        return userFollowRepository.findFollowerIdsByFollowingId(userId);
    }

    /**
     * Get follower count for a user
     * @param userId The user ID
     * @return Number of followers
     */
    public long getFollowerCount(UUID userId) {
        return userFollowRepository.countById_FollowingId(userId);
    }

    /**
     * Get following count for a user
     * @param userId The user ID
     * @return Number of users being followed
     */
    public long getFollowingCount(UUID userId) {
        return userFollowRepository.countById_FollowerId(userId);
    }

    /**
     * Check if two users follow each other (mutual following)
     * @param userId1 First user ID
     * @param userId2 Second user ID
     * @return true if both users follow each other
     */
    public boolean areMutualFollowing(UUID userId1, UUID userId2) {
        return userFollowRepository.areUsersMutualFollowing(userId1, userId2);
    }
}

