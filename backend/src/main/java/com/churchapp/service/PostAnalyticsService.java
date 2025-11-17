package com.churchapp.service;

import com.churchapp.entity.Post;
import com.churchapp.entity.PostView;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.PostViewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
     */
    @Transactional
    public void recordPostView(UUID postId, UUID viewerId) {
        // Verify post exists
        if (!postRepository.existsById(postId)) {
            log.warn("Attempted to record view for non-existent post: {}", postId);
            return;
        }

        // If viewer is provided, check if already viewed today
        if (viewerId != null) {
            LocalDate today = LocalDate.now();
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime startOfNextDay = today.plusDays(1).atStartOfDay();
            
            if (postViewRepository.hasViewedToday(postId, viewerId, startOfDay, startOfNextDay)) {
                log.debug("Post view already recorded today for post {} by viewer {}", postId, viewerId);
                return;
            }
        }

        // Create new post view
        PostView postView = new PostView();
        postView.setPostId(postId);
        postView.setViewerId(viewerId); // Can be null for anonymous views
        postView.setTimeSpentSeconds(0);

        postViewRepository.save(postView);
        log.debug("Recorded post view: post={}, viewer={}", postId, viewerId);
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
}

