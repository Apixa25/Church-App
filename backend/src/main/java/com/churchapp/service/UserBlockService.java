package com.churchapp.service;

import com.churchapp.entity.UserBlock;
import com.churchapp.repository.UserBlockRepository;
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
public class UserBlockService {

    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;
    private final UserFollowService userFollowService;

    /**
     * Block a user
     * @param blockerId The user who wants to block
     * @param blockedId The user to be blocked
     * @throws RuntimeException if users are the same or if user doesn't exist
     */
    public void blockUser(UUID blockerId, UUID blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new RuntimeException("You cannot block yourself");
        }

        // Verify both users exist
        if (!userRepository.existsById(blockerId)) {
            throw new RuntimeException("Blocker user not found");
        }
        
        if (!userRepository.existsById(blockedId)) {
            throw new RuntimeException("User to block not found");
        }

        // Check if already blocked
        if (userBlockRepository.existsById_BlockerIdAndId_BlockedId(blockerId, blockedId)) {
            log.debug("User {} already blocks {}", blockerId, blockedId);
            return; // Already blocked, no error
        }

        // If blocker was following blocked user, unfollow them
        if (userFollowService.isFollowing(blockerId, blockedId)) {
            log.info("Unfollowing {} because {} is blocking them", blockedId, blockerId);
            userFollowService.unfollowUser(blockerId, blockedId);
        }

        // If blocked user was following blocker, unfollow them
        if (userFollowService.isFollowing(blockedId, blockerId)) {
            log.info("Removing follow relationship because {} blocked {}", blockedId, blockerId);
            userFollowService.unfollowUser(blockedId, blockerId);
        }

        // Create block relationship
        UserBlock.UserBlockId blockId = new UserBlock.UserBlockId();
        blockId.setBlockerId(blockerId);
        blockId.setBlockedId(blockedId);

        UserBlock userBlock = new UserBlock();
        userBlock.setId(blockId);

        userBlockRepository.save(userBlock);
        log.info("User {} blocked {}", blockerId, blockedId);
    }

    /**
     * Unblock a user
     * @param blockerId The user who wants to unblock
     * @param blockedId The user to be unblocked
     */
    public void unblockUser(UUID blockerId, UUID blockedId) {
        if (blockerId.equals(blockedId)) {
            throw new RuntimeException("You cannot unblock yourself");
        }

        userBlockRepository.deleteByBlockerIdAndBlockedId(blockerId, blockedId);
        log.info("User {} unblocked {}", blockerId, blockedId);
    }

    /**
     * Check if a user blocks another user
     * @param blockerId The potential blocker
     * @param blockedId The potential blockee
     * @return true if blockerId blocks blockedId
     */
    public boolean isBlocked(UUID blockerId, UUID blockedId) {
        return userBlockRepository.existsById_BlockerIdAndId_BlockedId(blockerId, blockedId);
    }

    /**
     * Get list of users blocked by a user
     * @param blockerId The user ID
     * @param pageable Pagination parameters
     * @return Page of UserBlock relationships
     */
    public Page<UserBlock> getBlockedUsers(UUID blockerId, Pageable pageable) {
        return userBlockRepository.findById_BlockerIdOrderByCreatedAtDesc(blockerId, pageable);
    }

    /**
     * Get list of user IDs blocked by a user
     * Used for feed queries
     * @param blockerId The user ID
     * @return List of UUIDs of blocked users
     */
    public List<UUID> getBlockedUserIds(UUID blockerId) {
        return userBlockRepository.findBlockedIdsByBlockerId(blockerId);
    }

    /**
     * Get blocked count for a user (how many users they've blocked)
     * @param blockerId The user ID
     * @return Number of blocked users
     */
    public long getBlockedCount(UUID blockerId) {
        return userBlockRepository.countById_BlockerId(blockerId);
    }

    /**
     * Check if any of the provided user IDs are blocked by the blocker
     * Used for filtering multiple users at once
     * @param blockerId The user who might be blocking
     * @param userIds List of user IDs to check
     * @return List of user IDs that are blocked
     */
    public List<UUID> getBlockedUserIdsFromList(UUID blockerId, List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return List.of();
        }
        return userBlockRepository.findBlockedIdsByBlockerIdAndUserIds(blockerId, userIds);
    }
}

