package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final HashtagRepository hashtagRepository;
    private final PostHashtagRepository postHashtagRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostShareRepository postShareRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final FeedFilterService feedFilterService;
    private final GroupRepository groupRepository;
    private final OrganizationRepository organizationRepository;
    private final UserFollowService userFollowService;
    private final UserBlockService userBlockService;

    @Transactional
    public Post createPost(String userEmail, String content, List<String> mediaUrls,
                          List<String> mediaTypes, Post.PostType postType,
                          String category, String location, boolean isAnonymous) {
        return createPost(userEmail, content, mediaUrls, mediaTypes, postType, category, location, isAnonymous, null, null);
    }

    @Transactional
    public Post createPost(String userEmail, String content, List<String> mediaUrls,
                          List<String> mediaTypes, Post.PostType postType,
                          String category, String location, boolean isAnonymous,
                          UUID organizationId, UUID groupId) {

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate content length
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Post content cannot be empty");
        }
        if (content.length() > 2000) {
            throw new IllegalArgumentException("Post content cannot exceed 2000 characters");
        }

        Post post = new Post();
        post.setUser(user);
        post.setContent(content.trim());
        post.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        post.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        post.setPostType(postType != null ? postType : Post.PostType.GENERAL);
        post.setCategory(category);
        post.setLocation(location);
        post.setIsAnonymous(isAnonymous);

        // Set group context first (optional - posts can be in groups)
        // IMPORTANT: If a group is specified, don't set organization (group takes priority)
        if (groupId != null) {
            Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
            post.setGroup(group);
            // Group posts should not have an organization - group takes priority
            post.setOrganization(null);
        } else {
            // No group specified - set organization context
            if (organizationId != null) {
                Organization org = organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new RuntimeException("Organization not found"));
                post.setOrganization(org);
            } else if (user.getPrimaryOrganization() != null) {
                // Default to user's primary organization if not specified
                post.setOrganization(user.getPrimaryOrganization());
            } else {
                // User has no primary org - use global org
                UUID globalOrgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
                Organization globalOrg = organizationRepository.findById(globalOrgId)
                    .orElseThrow(() -> new RuntimeException("Global organization not found"));
                post.setOrganization(globalOrg);
            }
        }

        // Snapshot user's primary org at post time for analytics
        if (user.getPrimaryOrganization() != null) {
            post.setUserPrimaryOrgIdSnapshot(user.getPrimaryOrganization().getId());
        }

        Post savedPost = postRepository.save(post);
        
        // LOG POST CREATION - Using both log.info and System.out to ensure visibility
        String postOrgId = post.getOrganization() != null ? post.getOrganization().getId().toString() : "null";
        String postOrgName = post.getOrganization() != null ? post.getOrganization().getName() : "null";
        String postGroupId = post.getGroup() != null ? post.getGroup().getId().toString() : "null";
        
        log.info("Created new post with ID: {} by user: {} in org: {} ({}) group: {}",
            savedPost.getId(), userEmail, postOrgId, postOrgName, postGroupId);
        
        System.out.println("===== POST CREATED =====");
        System.out.println("Post ID: " + savedPost.getId());
        System.out.println("User: " + userEmail);
        System.out.println("Organization ID: " + postOrgId);
        System.out.println("Organization Name: " + postOrgName);
        System.out.println("Group ID: " + postGroupId);
        System.out.println("========================");

        // Process hashtags in content
        processHashtags(savedPost);

        return savedPost;
    }

    @Transactional
    public Post createReply(String userEmail, UUID parentPostId, String content,
                           List<String> mediaUrls, List<String> mediaTypes, boolean isAnonymous) {

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post parentPost = postRepository.findById(parentPostId)
            .orElseThrow(() -> new RuntimeException("Parent post not found"));

        Post reply = new Post();
        reply.setUser(user);
        reply.setContent(content.trim());
        reply.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        reply.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        reply.setParentPost(parentPost);
        reply.setIsReply(true);
        reply.setIsAnonymous(isAnonymous);

        Post savedReply = postRepository.save(reply);

        // Increment comment count on parent post
        parentPost.incrementCommentsCount();
        postRepository.save(parentPost);

        log.info("Created reply with ID: {} to post: {}", savedReply.getId(), parentPostId);

        // Process hashtags in reply
        processHashtags(savedReply);

        return savedReply;
    }

    @Transactional
    public Post createQuote(String userEmail, UUID quotedPostId, String content,
                           List<String> mediaUrls, List<String> mediaTypes) {

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post quotedPost = postRepository.findById(quotedPostId)
            .orElseThrow(() -> new RuntimeException("Quoted post not found"));

        Post quote = new Post();
        quote.setUser(user);
        quote.setContent(content.trim());
        quote.setMediaUrls(mediaUrls != null ? mediaUrls : List.of());
        quote.setMediaTypes(mediaTypes != null ? mediaTypes : List.of());
        quote.setQuotedPost(quotedPost);
        quote.setIsQuote(true);

        Post savedQuote = postRepository.save(quote);

        // Increment shares count on quoted post
        quotedPost.incrementSharesCount();
        postRepository.save(quotedPost);

        log.info("Created quote with ID: {} of post: {}", savedQuote.getId(), quotedPostId);

        // Process hashtags in quote
        processHashtags(savedQuote);

        return savedQuote;
    }

    public Optional<Post> getPost(UUID postId) {
        return postRepository.findById(postId);
    }

    public Page<Post> getUserPosts(UUID userId, UUID viewerUserId, Pageable pageable) {
        // For mutual blocking: check if viewer has blocked this user OR user has blocked viewer
        if (viewerUserId != null && !userId.equals(viewerUserId)) {
            List<UUID> mutuallyBlocked = userBlockService.getMutuallyBlockedUserIds(viewerUserId);
            if (mutuallyBlocked.contains(userId)) {
                // Return empty page if there's a mutual block relationship
                return new PageImpl<>(List.of(), pageable, 0);
            }
        }
        
        // Use query that handles hidden posts: shows hidden posts only to the author
        return postRepository.findByUserIdForViewer(userId, viewerUserId, pageable);
    }

    /**
     * Get posts with media by a specific user
     * Filters based on mutual blocking when viewing another user's profile
     * Shows hidden posts only to the author
     */
    public Page<Post> getUserPostsWithMedia(UUID userId, UUID viewerUserId, Pageable pageable) {
        // For mutual blocking: check if viewer has blocked this user OR user has blocked viewer
        if (viewerUserId != null && !userId.equals(viewerUserId)) {
            List<UUID> mutuallyBlocked = userBlockService.getMutuallyBlockedUserIds(viewerUserId);
            if (mutuallyBlocked.contains(userId)) {
                // Return empty page if there's a mutual block relationship
                return new PageImpl<>(List.of(), pageable, 0);
            }
        }
        
        // Use query that handles hidden posts: shows hidden posts only to the author
        return postRepository.findPostsWithMediaByUserIdForViewer(userId, viewerUserId, pageable);
    }

    public Page<Post> getFeed(String userEmail, String feedType, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        switch (feedType.toLowerCase()) {
            case "following":
                return getFollowingFeed(user.getId(), pageable);
            case "trending":
                return getTrendingFeed(user.getId(), pageable);
            case "chronological":
            default:
                return getMultiTenantFeed(user.getId(), pageable);
        }
    }

    /**
     * Get multi-tenant feed based on user's organizations and groups
     * Excludes posts from blocked users (mutual blocking)
     * Includes posts from followed users when filter is ALL or EVERYTHING
     */
    public Page<Post> getMultiTenantFeed(UUID userId, Pageable pageable) {
        FeedFilterService.FeedParameters params = feedFilterService.getFeedParameters(userId);
        FeedPreference preference = feedFilterService.getFeedPreference(userId);

        // Get mutually blocked user IDs to filter out (users viewer blocked + users who blocked viewer)
        List<UUID> blockedUserIds = userBlockService.getMutuallyBlockedUserIds(userId);
        // Use empty list instead of null for better query performance
        List<UUID> blockedIds = blockedUserIds.isEmpty() ? null : blockedUserIds;

        // Get followed user IDs if filter is ALL or EVERYTHING
        List<UUID> followingIds = null;
        if (preference.getActiveFilter() == FeedPreference.FeedFilter.ALL 
            || preference.getActiveFilter() == FeedPreference.FeedFilter.EVERYTHING) {
            followingIds = userFollowService.getFollowingIds(userId);
            // Use null if empty for query performance
            if (followingIds.isEmpty()) {
                followingIds = null;
            }
        }

        // Check if user has primary org(s) - supports dual-primary system
        if (params.getPrimaryOrgIds().isEmpty()) {
            // Social-only user - show global org + their groups + org-as-groups + followed users
            UUID globalOrgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
            return postRepository.findGlobalUserFeed(
                params.getGroupIds(), 
                globalOrgId,
                params.getOrgAsGroupIds(), // Organizations followed as groups
                blockedIds,
                followingIds,
                pageable
            );
        } else {
            // User with primary org(s) - use unified query that handles:
            // - Primary orgs (all visibility levels) - supports dual-primary: churchPrimary + familyPrimary
            // - Secondary orgs including Global org (PUBLIC only)
            // - Groups (based on group visibility)
            // - Organizations followed as groups (ALL posts - PUBLIC + ORG_ONLY)
            // - Followed users (when filter is ALL or EVERYTHING) - regardless of organization/group
            return postRepository.findMultiTenantFeed(
                params.getPrimaryOrgIds(), // Now a list supporting dual-primary system
                params.getSecondaryOrgIds(),
                params.getGroupIds(),
                params.getOrgAsGroupIds(), // Organizations followed as groups
                blockedIds,
                followingIds, // Add followed user IDs
                pageable
            );
        }
    }

    /**
     * Get feed for a specific organization
     */
    public Page<Post> getOrganizationFeed(UUID organizationId, Pageable pageable) {
        return postRepository.findByOrganizationId(organizationId, pageable);
    }

    /**
     * Get feed for a specific group
     */
    public Page<Post> getGroupFeed(UUID groupId, Pageable pageable) {
        return postRepository.findByGroupId(groupId, pageable);
    }

    public Page<Post> getFollowingFeed(UUID userId, Pageable pageable) {
        // Get users that this user follows (across all organizations)
        List<UUID> followingIds = userFollowService.getFollowingIds(userId);

        if (followingIds.isEmpty()) {
            // If user follows no one, return empty page
            return new PageImpl<>(List.of(), pageable, 0);
        }

        // Get mutually blocked user IDs to filter out (users viewer blocked + users who blocked viewer)
        List<UUID> blockedUserIds = userBlockService.getMutuallyBlockedUserIds(userId);
        // Use empty list instead of null for better query performance
        List<UUID> blockedIds = blockedUserIds.isEmpty() ? null : blockedUserIds;

        // Get posts from followed users (works globally across all organizations)
        // Excludes posts from blocked users (mutual blocking)
        return postRepository.findPostsByFollowingUsers(followingIds, blockedIds, pageable);
    }

    public Page<Post> getTrendingFeed(UUID userId, Pageable pageable) {
        // Get trending posts filtered by user's feed parameters
        FeedFilterService.FeedParameters params = feedFilterService.getFeedParameters(userId);
        LocalDateTime since = LocalDateTime.now().minusDays(7);

        // Get mutually blocked user IDs to filter out (users viewer blocked + users who blocked viewer)
        List<UUID> blockedUserIds = userBlockService.getMutuallyBlockedUserIds(userId);
        // Use empty list instead of null for better query performance
        List<UUID> blockedIds = blockedUserIds.isEmpty() ? null : blockedUserIds;

        // If user has primary org(s), show trending from first primary org (churchPrimary)
        // Note: For dual-primary system, we use churchPrimary for trending
        if (!params.getPrimaryOrgIds().isEmpty()) {
            return postRepository.findTrendingPostsByOrganization(params.getPrimaryOrgIds().get(0), since, blockedIds, pageable);
        } else {
            // Social-only user - show global trending
            return postRepository.findTrendingPosts(since, blockedIds, pageable);
        }
    }

    public Page<Post> searchPosts(String searchTerm, Pageable pageable) {
        return postRepository.findByContentContaining(searchTerm, null, pageable);
    }

    public List<Post> getPostThread(UUID postId) {
        return postRepository.findThreadByPostId(postId);
    }

    @Transactional
    public void deletePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if user owns the post or is an admin/moderator
        boolean isOwner = post.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == User.Role.PLATFORM_ADMIN;
        boolean isModerator = user.getRole() == User.Role.MODERATOR;

        log.info("Delete authorization check - Post: {} | Owner: {} | Current User: {} | User Role: {} | Is Owner: {} | Is Admin: {} | Is Moderator: {}", 
                postId, post.getUser().getId(), user.getId(), user.getRole(), isOwner, isAdmin, isModerator);

        if (!isOwner && !isAdmin && !isModerator) {
            throw new RuntimeException("Not authorized to delete this post. Only the post owner, administrators, or moderators can delete posts.");
        }

        // Clean up related data
        cleanupPostData(postId);

        // Delete the post
        postRepository.delete(post);

        log.info("Deleted post with ID: {} by user: {} (Role: {})", postId, userEmail, user.getRole());
    }

    @Transactional
    public void likePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if already liked
        if (postLikeRepository.existsById_PostIdAndId_UserId(postId, user.getId())) {
            throw new RuntimeException("Post already liked");
        }

        // Create like
        PostLike.PostLikeId likeId = new PostLike.PostLikeId(postId, user.getId());
        PostLike like = new PostLike();
        like.setId(likeId);

        postLikeRepository.save(like);

        // Update post like count
        post.incrementLikesCount();
        postRepository.save(post);

        log.info("User {} liked post {}", userEmail, postId);
    }

    @Transactional
    public void unlikePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Find and delete like
        Optional<PostLike> like = postLikeRepository.findById_PostIdAndId_UserId(postId, user.getId());
        if (like.isPresent()) {
            postLikeRepository.delete(like.get());

            // Update post like count
            post.decrementLikesCount();
            postRepository.save(post);

            log.info("User {} unliked post {}", userEmail, postId);
        }
    }

    public boolean isPostLikedByUser(UUID postId, UUID userId) {
        return postLikeRepository.existsById_PostIdAndId_UserId(postId, userId);
    }

    @Transactional
    public void sharePost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if already shared
        if (postShareRepository.existsByPostIdAndUserId(postId, user.getId())) {
            throw new RuntimeException("Post already shared");
        }

        // Create share
        PostShare share = new PostShare();
        share.setPost(post);
        share.setUser(user);
        share.setShareType(PostShare.ShareType.REPOST);

        postShareRepository.save(share);

        // Update post share count
        post.incrementSharesCount();
        postRepository.save(post);

        log.info("User {} shared post {}", userEmail, postId);
    }

    @Transactional
    public void bookmarkPost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Check if already bookmarked
        if (postBookmarkRepository.existsById_PostIdAndId_UserId(postId, user.getId())) {
            throw new RuntimeException("Post already bookmarked");
        }

        // Create bookmark
        PostBookmark.PostBookmarkId bookmarkId = new PostBookmark.PostBookmarkId(postId, user.getId());
        PostBookmark bookmark = new PostBookmark();
        bookmark.setId(bookmarkId);

        postBookmarkRepository.save(bookmark);

        // Update post bookmark count
        post.incrementBookmarksCount();
        postRepository.save(post);

        log.info("User {} bookmarked post {}", userEmail, postId);
    }

    @Transactional
    public void unbookmarkPost(String userEmail, UUID postId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new RuntimeException("Post not found"));

        // Find and delete bookmark
        Optional<PostBookmark> bookmark = postBookmarkRepository.findById_PostIdAndId_UserId(postId, user.getId());
        if (bookmark.isPresent()) {
            postBookmarkRepository.delete(bookmark.get());

            // Update post bookmark count
            post.decrementBookmarksCount();
            postRepository.save(post);

            log.info("User {} unbookmarked post {}", userEmail, postId);
        }
    }

    private void processHashtags(Post post) {
        // Extract hashtags from content using regex
        String hashtagPattern = "#(\\w+)";
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(hashtagPattern);
        java.util.regex.Matcher matcher = pattern.matcher(post.getContent());

        while (matcher.find()) {
            String tag = matcher.group(1);
            Optional<Hashtag> existingHashtag = hashtagRepository.findByTag(tag);

            Hashtag hashtag;
            if (existingHashtag.isPresent()) {
                hashtag = existingHashtag.get();
                hashtag.incrementUsageCount();
            } else {
                hashtag = new Hashtag();
                hashtag.setTag(tag);
                hashtag.setUsageCount(1);
            }

            hashtag = hashtagRepository.save(hashtag);

            // Create post-hashtag relationship
            PostHashtag.PostHashtagId postHashtagId = new PostHashtag.PostHashtagId(post.getId(), hashtag.getId());
            PostHashtag postHashtag = new PostHashtag();
            postHashtag.setId(postHashtagId);
            postHashtagRepository.save(postHashtag);
        }
    }

    private void cleanupPostData(UUID postId) {
        // Delete associated likes, comments, shares, bookmarks
        postLikeRepository.deleteByPostId(postId);
        postCommentRepository.deleteByPostId(postId);
        postShareRepository.deleteByPostId(postId);
        postBookmarkRepository.deleteByPostId(postId);
        postHashtagRepository.deleteByPostId(postId);
    }

    // Statistics methods
    public long getUserPostCount(UUID userId) {
        return postRepository.countByUserId(userId);
    }

    public long getUserPostCountSince(UUID userId, LocalDateTime since) {
        return postRepository.countByUserIdSince(userId, since);
    }
}
