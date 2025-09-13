package com.churchapp.service;

import com.churchapp.entity.Post;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.UserFollowRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedService {

    private final PostRepository postRepository;
    private final UserFollowRepository userFollowRepository;

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
                return getTrendingFeed(pageable);
            case FOR_YOU:
                return getForYouFeed(userId, pageable);
            case CHRONOLOGICAL:
            default:
                return getChronologicalFeed(pageable);
        }
    }

    /**
     * Get chronological feed - all posts in reverse chronological order
     */
    private Page<Post> getChronologicalFeed(Pageable pageable) {
        return postRepository.findMainPostsForFeed(pageable);
    }

    /**
     * Get community feed - all posts from all users (church community model)
     * No following system needed for small church communities
     */
    private Page<Post> getFollowingFeed(UUID userId, Pageable pageable) {
        log.debug("User {} requesting community feed - showing all posts", userId);
        // In church community model, everyone sees everyone's posts
        // This is simpler and more appropriate for church context
        return getChronologicalFeed(pageable);
    }

    /**
     * Get trending feed - posts with high engagement in the last 24 hours
     */
    private Page<Post> getTrendingFeed(Pageable pageable) {
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        Page<Post> trendingPosts = postRepository.findTrendingPosts(since, pageable);

        log.debug("Found {} trending posts since {}", trendingPosts.getTotalElements(), since);
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
        Page<Post> trendingPosts = getTrendingFeed(PageRequest.of(0, pageable.getPageSize() / 2));

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
     * Search posts by content
     */
    public Page<Post> searchPosts(String query, Pageable pageable) {
        return postRepository.findByContentContaining(query, pageable);
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
        return getTrendingFeed(pageable);
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
        long postsLast24Hours = postRepository.findMainPostsForFeed(PageRequest.of(0, Integer.MAX_VALUE))
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
