package com.churchapp.service;

import com.churchapp.entity.Post;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.UserFollowRepository;
import com.churchapp.service.UserBlockService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedService {

    private final PostRepository postRepository;
    private final UserFollowRepository userFollowRepository;
    private final UserBlockService userBlockService;

    public enum FeedType {
        CHRONOLOGICAL,  // Most recent posts first
        FOLLOWING,      // Posts from people you follow
        TRENDING,       // Posts with high engagement
        FOR_YOU         // Algorithmic feed (future enhancement)
    }

    /**
     * Get feed based on type for a specific user
     */
    public Page<Post> getFeed(UUID userId, FeedType feedType, Pageable pageable) {
        log.debug("Getting {} feed for user {}", feedType, userId);

        switch (feedType) {
            case FOLLOWING:
                return getFollowingFeed(userId, pageable);
            case TRENDING:
                return getTrendingFeed(userId, pageable);
            case FOR_YOU:
                return getForYouFeed(userId, pageable);
            case CHRONOLOGICAL:
            default:
                return getChronologicalFeed(userId, pageable);
        }
    }

    /**
     * Get chronological feed - all posts in reverse chronological order
     * Note: This method doesn't filter by blocked users since it's used for general feeds
     * For user-specific feeds, use getChronologicalFeed(UUID userId, Pageable pageable)
     */
    private Page<Post> getChronologicalFeed(Pageable pageable) {
        // Pass null for blockedUserIds to show all posts (for anonymous/public feeds)
        return postRepository.findMainPostsForFeed(null, pageable);
    }

    /**
     * Get chronological feed for a specific user (filters blocked users)
     */
    private Page<Post> getChronologicalFeed(UUID userId, Pageable pageable) {
        List<UUID> blockedUserIds = userBlockService.getBlockedUserIds(userId);
        List<UUID> blockedIds = blockedUserIds.isEmpty() ? null : blockedUserIds;
        return postRepository.findMainPostsForFeed(blockedIds, pageable);
    }

    /**
     * Get community feed - all posts from all users (church community model)
     * No following system needed for small church communities
     */
    private Page<Post> getFollowingFeed(UUID userId, Pageable pageable) {
        log.debug("User {} requesting community feed - showing all posts", userId);
        // In church community model, everyone sees everyone's posts
        // This is simpler and more appropriate for church context
        // But we still filter blocked users
        return getChronologicalFeed(userId, pageable);
    }

    /**
     * Get trending feed - posts with high engagement in the last 7 days
     * Note: This method doesn't filter by blocked users since it's used for general feeds
     * For user-specific feeds, use getTrendingFeed(UUID userId, Pageable pageable)
     */
    private Page<Post> getTrendingFeed(Pageable pageable) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        // Pass null for blockedUserIds to show all posts (for anonymous/public feeds)
        Page<Post> trendingPosts = postRepository.findTrendingPosts(since, null, pageable);

        log.debug("Found {} trending posts since {}", trendingPosts.getTotalElements(), since);
        return trendingPosts;
    }

    /**
     * Get trending feed for a specific user (filters blocked users)
     */
    private Page<Post> getTrendingFeed(UUID userId, Pageable pageable) {
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<UUID> blockedUserIds = userBlockService.getBlockedUserIds(userId);
        List<UUID> blockedIds = blockedUserIds.isEmpty() ? null : blockedUserIds;
        Page<Post> trendingPosts = postRepository.findTrendingPosts(since, blockedIds, pageable);

        log.debug("Found {} trending posts since {} for user {}", trendingPosts.getTotalElements(), since, userId);
        return trendingPosts;
    }

    /**
     * Get personalized feed - mix of following + trending + chronological
     * This is a basic implementation that can be enhanced with ML algorithms
     */
    private Page<Post> getForYouFeed(UUID userId, Pageable pageable) {
        // For now, combine following and trending feeds
        // In a full implementation, this would use machine learning

        Page<Post> followingPosts = getFollowingFeed(userId, PageRequest.of(0, pageable.getPageSize() / 2));
        Page<Post> trendingPosts = getTrendingFeed(userId, PageRequest.of(0, pageable.getPageSize() / 2));

        // Simple algorithm: alternate between following and trending posts
        // In production, you'd want a more sophisticated algorithm

        List<Post> combinedPosts = new java.util.ArrayList<>();
        java.util.List<Post> followingList = followingPosts.getContent();
        java.util.List<Post> trendingList = trendingPosts.getContent();

        int maxSize = Math.max(followingList.size(), trendingList.size());
        for (int i = 0; i < maxSize; i++) {
            if (i < followingList.size()) {
                combinedPosts.add(followingList.get(i));
            }
            if (i < trendingList.size()) {
                combinedPosts.add(trendingList.get(i));
            }
        }

        // Take only the requested page size
        List<Post> pageContent = combinedPosts.stream()
            .limit(pageable.getPageSize())
            .collect(java.util.stream.Collectors.toList());

        return new org.springframework.data.domain.PageImpl<>(
            pageContent, pageable, combinedPosts.size()
        );
    }

    /**
     * Get posts by category
     */
    public Page<Post> getPostsByCategory(String category, Pageable pageable) {
        return postRepository.findByCategoryOrderByCreatedAtDesc(category, pageable);
    }

    /**
     * Get posts by type (prayer, testimony, announcement, etc.)
     */
    public Page<Post> getPostsByType(Post.PostType postType, Pageable pageable) {
        return postRepository.findRecentPostsByType(postType, pageable);
    }

    /**
     * Get posts with media
     */
    public Page<Post> getPostsWithMedia(Pageable pageable) {
        return postRepository.findPostsWithMedia(pageable);
    }

    /**
     * Get posts by location
     */
    public Page<Post> getPostsByLocation(String location, Pageable pageable) {
        return postRepository.findByLocationOrderByCreatedAtDesc(location, pageable);
    }

    /**
     * Search posts by content, author name, category, location, and hashtags
     * Optionally filter by post type
     */
    public Page<Post> searchPosts(String query, Post.PostType postType, Pageable pageable) {
        log.info("🔍 FeedService.searchPosts called with query: '{}', postType: '{}', pageable: {}", query, postType, pageable);
        
        // Search by content, author name, category, and location
        Page<Post> contentResults = postRepository.findByContentContaining(query, postType, pageable);
        log.info("📝 Content search found {} posts (total: {})", contentResults.getContent().size(), contentResults.getTotalElements());
        
        // Search by hashtags
        Page<Post> hashtagResults = postRepository.findByHashtagContaining(query, postType, pageable);
        log.info("🏷️ Hashtag search found {} posts (total: {})", hashtagResults.getContent().size(), hashtagResults.getTotalElements());
        
        // Combine results (avoid duplicates)
        Set<UUID> seenIds = new HashSet<>();
        List<Post> combinedResults = new ArrayList<>();
        
        // Add content results
        for (Post post : contentResults.getContent()) {
            if (!seenIds.contains(post.getId())) {
                combinedResults.add(post);
                seenIds.add(post.getId());
            }
        }
        
        // Add hashtag results
        for (Post post : hashtagResults.getContent()) {
            if (!seenIds.contains(post.getId())) {
                combinedResults.add(post);
                seenIds.add(post.getId());
            }
        }
        
        // Sort by creation date (most recent first)
        combinedResults.sort((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()));
        
        // Create a new Page with combined results
        Page<Post> finalResults = new PageImpl<>(combinedResults, pageable, seenIds.size());
        
        log.info("✅ Final combined search found {} posts", finalResults.getContent().size());
        if (!finalResults.getContent().isEmpty()) {
            log.info("📝 First post content preview: {}", finalResults.getContent().get(0).getContent().substring(0, Math.min(100, finalResults.getContent().get(0).getContent().length())));
        }
        
        return finalResults;
    }

    /**
     * Get thread by post ID (post and all its replies)
     */
    public List<Post> getPostThread(UUID postId) {
        return postRepository.findThreadByPostId(postId);
    }

    /**
     * Get user's posts for their profile
     */
    public Page<Post> getUserProfilePosts(UUID userId, Pageable pageable) {
        return postRepository.findAllByUserIdIncludingReplies(userId, pageable);
    }

    /**
     * Get suggested posts for user (based on their interests/interactions)
     * This is a basic implementation that can be enhanced
     */
    public Page<Post> getSuggestedPosts(UUID userId, Pageable pageable) {
        // For now, return trending posts
        // In production, this would analyze user's past interactions,
        // followed users' interests, etc.
        return getTrendingFeed(userId, pageable);
    }

    /**
     * Get posts from specific users (useful for group feeds, etc.)
     */
    public Page<Post> getPostsFromUsers(List<UUID> userIds, Pageable pageable) {
        if (userIds.isEmpty()) {
            return Page.empty(pageable);
        }

        // This would require a custom query in the repository
        // For now, return empty - implement when needed
        return Page.empty(pageable);
    }

    /**
     * Get feed statistics
     */
    public FeedStats getFeedStats() {
        long totalPosts = postRepository.count();
        LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
        // Pass null for blockedUserIds since this is general stats
        long postsLast24Hours = postRepository.findMainPostsForFeed(null, PageRequest.of(0, Integer.MAX_VALUE))
            .getContent().stream()
            .filter(post -> post.getCreatedAt().isAfter(yesterday))
            .count();

        return new FeedStats(totalPosts, postsLast24Hours);
    }

    /**
     * Feed statistics data class
     */
    public static class FeedStats {
        private final long totalPosts;
        private final long postsLast24Hours;

        public FeedStats(long totalPosts, long postsLast24Hours) {
            this.totalPosts = totalPosts;
            this.postsLast24Hours = postsLast24Hours;
        }

        public long getTotalPosts() { return totalPosts; }
        public long getPostsLast24Hours() { return postsLast24Hours; }
    }
}
