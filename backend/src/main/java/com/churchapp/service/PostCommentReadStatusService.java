package com.churchapp.service;

import com.churchapp.repository.PostCommentReadStatusRepository;
import com.churchapp.repository.PostCommentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for managing post comment read status
 * Tracks when users last viewed comments on posts to power "new comments" indicators
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PostCommentReadStatusService {

    private final PostCommentReadStatusRepository readStatusRepository;
    private final PostCommentRepository commentRepository;

    /**
     * Get count of new comments for a single post
     * @param userId User ID
     * @param postId Post ID
     * @return Number of comments created since user last viewed this post
     */
    public int getNewCommentCount(UUID userId, UUID postId) {
        var status = readStatusRepository.findByUserIdAndPostId(userId, postId);

        if (status.isEmpty()) {
            // Never read - count all comments
            long totalComments = commentRepository.countByPostId(postId);
            return (int) totalComments;
        }

        LocalDateTime lastRead = status.get().getLastReadAt();
        long newComments = commentRepository.countByPostIdAndCreatedAtAfter(postId, lastRead);
        return (int) newComments;
    }

    /**
     * Get counts of new comments for multiple posts (batch operation for feed)
     * This is optimized for loading an entire feed of posts at once
     *
     * @param userId User ID
     * @param postIds List of post IDs
     * @return Map of postId (as String) -> newCommentCount
     */
    public Map<String, Integer> getNewCommentCounts(UUID userId, List<UUID> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return new HashMap<>();
        }

        List<Map<String, Object>> results = readStatusRepository
            .getNewCommentCounts(userId, postIds);

        Map<String, Integer> counts = new HashMap<>();
        for (Map<String, Object> row : results) {
            UUID postId = (UUID) row.get("postId");
            Long count = (Long) row.get("newCount");
            counts.put(postId.toString(), count.intValue());
        }

        return counts;
    }

    /**
     * Mark all comments on a post as read
     * Called when user opens the post's comment thread
     *
     * @param userId User ID
     * @param postId Post ID
     */
    @Transactional
    public void markPostAsRead(UUID userId, UUID postId) {
        try {
            readStatusRepository.markPostAsRead(userId, postId, LocalDateTime.now());
            log.debug("Marked post {} as read for user {}", postId, userId);
        } catch (Exception e) {
            log.error("Error marking post {} as read for user {}: {}", postId, userId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Delete read status for a user (cleanup on user deletion)
     *
     * @param userId User ID
     */
    @Transactional
    public void deleteByUserId(UUID userId) {
        try {
            readStatusRepository.deleteByUserId(userId);
            log.info("Deleted read status entries for user {}", userId);
        } catch (Exception e) {
            log.error("Error deleting read status for user {}: {}", userId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Delete read status for a post (cleanup on post deletion)
     *
     * @param postId Post ID
     */
    @Transactional
    public void deleteByPostId(UUID postId) {
        try {
            readStatusRepository.deleteByPostId(postId);
            log.debug("Deleted read status entries for post {}", postId);
        } catch (Exception e) {
            log.error("Error deleting read status for post {}: {}", postId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Clean up old read status entries (older than 90 days)
     * This helps keep the table size manageable
     * Should be called periodically (e.g., daily cron job)
     */
    @Transactional
    public void cleanupOldReadStatuses() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(90);
            readStatusRepository.deleteOldReadStatuses(cutoffDate);
            log.info("Cleaned up read status entries older than {}", cutoffDate);
        } catch (Exception e) {
            log.error("Error cleaning up old read statuses: {}", e.getMessage(), e);
        }
    }

    /**
     * Mark all received comments as read
     * This is called when user clicks on "Comments" tab in their profile
     * It marks all posts where the user received comments as read
     *
     * @param userId User ID (the post owner)
     */
    @Transactional
    public void markAllReceivedCommentsAsRead(UUID userId) {
        try {
            // Get all post IDs where the user has received comments from others
            List<UUID> postIds = commentRepository.findPostIdsWithCommentsReceivedByUserId(userId);

            if (postIds.isEmpty()) {
                log.debug("No posts with received comments for user {}", userId);
                return;
            }

            LocalDateTime now = LocalDateTime.now();
            for (UUID postId : postIds) {
                readStatusRepository.markPostAsRead(userId, postId, now);
            }

            log.info("Marked {} posts as read for user {} (received comments)", postIds.size(), userId);
        } catch (Exception e) {
            log.error("Error marking all received comments as read for user {}: {}", userId, e.getMessage(), e);
            throw e;
        }
    }
}
