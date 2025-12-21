package com.churchapp.service;

import com.churchapp.entity.Post;
import com.churchapp.entity.PostView;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.PostViewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostAnalyticsService {

    private final PostViewRepository postViewRepository;
    private final PostRepository postRepository;

    /**
     * Record a post view
     * Only records one view per viewer per day to prevent spam
     * Uses PostgreSQL's ON CONFLICT DO NOTHING to handle race conditions gracefully
     */
    @Transactional
    public void recordPostView(UUID postId, UUID viewerId) {
        try {
            // Verify post exists
            if (!postRepository.existsById(postId)) {
                log.warn("Attempted to record view for non-existent post: {}", postId);
                return;
            }

            // For anonymous views (viewerId is null), use regular save
            // The unique constraint only applies to non-null viewer_id
            if (viewerId == null) {
                PostView postView = new PostView();
                postView.setPostId(postId);
                postView.setViewerId(null);
                postView.setTimeSpentSeconds(0);
                postViewRepository.save(postView);
                log.debug("Recorded anonymous post view: post={}", postId);
                return;
            }

            // For authenticated views, use upsert to handle race conditions
            // This prevents duplicate key violations when multiple requests happen simultaneously
            try {
                postViewRepository.insertPostViewIfNotExists(postId, viewerId, 0);
                log.debug("Recorded post view: post={}, viewer={}", postId, viewerId);

                // Increment denormalized views_count on Post entity (for fast display)
                incrementPostViewsCount(postId);

            } catch (Exception e) {
                // Fallback: if native query fails, try the old method with exception handling
                // This shouldn't happen, but provides a safety net
                log.warn("Upsert failed, falling back to save with exception handling: post={}, viewer={}", postId, viewerId, e);
                try {
                    PostView postView = new PostView();
                    postView.setPostId(postId);
                    postView.setViewerId(viewerId);
                    postView.setTimeSpentSeconds(0);
                    postViewRepository.save(postView);
                    log.debug("Recorded post view (fallback): post={}, viewer={}", postId, viewerId);

                    // Increment denormalized views_count on Post entity (for fast display)
                    incrementPostViewsCount(postId);

                } catch (DataIntegrityViolationException ex) {
                    // Race condition: another thread already inserted this view
                    // This is expected and can be safely ignored
                    log.debug("Post view already recorded (race condition): post={}, viewer={}", postId, viewerId);
                }
            }
        } catch (Exception e) {
            // Catch any unexpected exceptions (including transaction commit failures)
            // Log but don't throw - view recording failure shouldn't break the user experience
            log.error("Error recording post view (non-fatal): post={}, viewer={}, error={}", 
                     postId, viewerId, e.getMessage(), e);
        }
    }

    /**
     * Get post engagement stats
     */
    public Map<String, Object> getPostEngagementStats(UUID postId) {
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Get view counts
        long totalViews = postViewRepository.countByPostId(postId);
        long uniqueViewers = postViewRepository.countUniqueViewers(postId);
        
        // Get views in different time periods
        long viewsToday = postViewRepository.countByPostIdAndViewedAtAfter(postId, LocalDateTime.now().minusDays(1));
        long viewsThisWeek = postViewRepository.countByPostIdAndViewedAtAfter(postId, LocalDateTime.now().minusDays(7));
        long viewsThisMonth = postViewRepository.countByPostIdAndViewedAtAfter(postId, LocalDateTime.now().minusDays(30));

        // Get engagement metrics
        long likes = post.getLikesCount() != null ? post.getLikesCount() : 0;
        long comments = post.getCommentsCount() != null ? post.getCommentsCount() : 0;
        long shares = post.getSharesCount() != null ? post.getSharesCount() : 0;
        long totalEngagements = likes + comments + shares;

        // Calculate engagement rate
        double engagementRate = totalViews > 0 ? (double) totalEngagements / totalViews * 100 : 0.0;

        // Get views by date for chart
        List<Object[]> viewsByDate = postViewRepository.getViewsByDate(postId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("postId", postId);
        stats.put("totalViews", totalViews);
        stats.put("uniqueViewers", uniqueViewers);
        stats.put("viewsToday", viewsToday);
        stats.put("viewsThisWeek", viewsThisWeek);
        stats.put("viewsThisMonth", viewsThisMonth);
        stats.put("likes", likes);
        stats.put("comments", comments);
        stats.put("shares", shares);
        stats.put("totalEngagements", totalEngagements);
        stats.put("engagementRate", Math.round(engagementRate * 100.0) / 100.0); // Round to 2 decimals
        stats.put("viewsByDate", viewsByDate);
        stats.put("createdAt", post.getCreatedAt());

        return stats;
    }

    /**
     * Get engagement stats for multiple posts (user's posts)
     */
    public Map<UUID, Map<String, Object>> getPostsEngagementStats(List<UUID> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return new HashMap<>();
        }

        Map<UUID, Map<String, Object>> statsMap = new HashMap<>();

        // Get view counts for all posts
        List<Object[]> viewsByPost = postViewRepository.countViewsByPostIds(postIds);
        Map<UUID, Long> viewCounts = new HashMap<>();
        for (Object[] result : viewsByPost) {
            viewCounts.put((UUID) result[0], (Long) result[1]);
        }

        // Get posts with their engagement data
        List<Post> posts = postRepository.findAllById(postIds);
        for (Post post : posts) {
            Map<String, Object> stats = new HashMap<>();
            stats.put("postId", post.getId());
            stats.put("totalViews", viewCounts.getOrDefault(post.getId(), 0L));
            stats.put("likes", post.getLikesCount() != null ? post.getLikesCount() : 0);
            stats.put("comments", post.getCommentsCount() != null ? post.getCommentsCount() : 0);
            stats.put("shares", post.getSharesCount() != null ? post.getSharesCount() : 0);
            stats.put("createdAt", post.getCreatedAt());
            
            long totalEngagements = (long) stats.get("likes") + (long) stats.get("comments") + (long) stats.get("shares");
            stats.put("totalEngagements", totalEngagements);
            
            long views = (Long) stats.get("totalViews");
            double engagementRate = views > 0 ? (double) totalEngagements / views * 100 : 0.0;
            stats.put("engagementRate", Math.round(engagementRate * 100.0) / 100.0);
            
            statsMap.put(post.getId(), stats);
        }

        return statsMap;
    }

    /**
     * Get post views (for detailed analytics)
     */
    public Page<PostView> getPostViews(UUID postId, Pageable pageable) {
        return postViewRepository.findByPostIdOrderByViewedAtDesc(postId, pageable);
    }

    /**
     * Increment the denormalized views_count on Post entity
     * Called when a view is successfully recorded
     * This provides fast view count display without querying post_views table
     */
    private void incrementPostViewsCount(UUID postId) {
        try {
            Post post = postRepository.findById(postId).orElse(null);
            if (post != null) {
                Integer currentCount = post.getViewsCount() != null ? post.getViewsCount() : 0;
                post.setViewsCount(currentCount + 1);
                postRepository.save(post);
                log.debug("Incremented views_count for post {} to {}", postId, post.getViewsCount());
            }
        } catch (Exception e) {
            // Don't throw - view count increment failure shouldn't break the experience
            log.error("Error incrementing views_count for post {}: {}", postId, e.getMessage());
        }
    }
}

