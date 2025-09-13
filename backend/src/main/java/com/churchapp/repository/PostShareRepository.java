package com.churchapp.repository;

import com.churchapp.entity.PostShare;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostShareRepository extends JpaRepository<PostShare, UUID> {

    // Find shares by post
    Page<PostShare> findByPostIdOrderByCreatedAtDesc(UUID postId, Pageable pageable);
    List<PostShare> findByPostIdOrderByCreatedAtDesc(UUID postId);

    // Find shares by user
    Page<PostShare> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<PostShare> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Find shares by type
    Page<PostShare> findByShareTypeOrderByCreatedAtDesc(PostShare.ShareType shareType, Pageable pageable);

    // Check if user shared a specific post
    Optional<PostShare> findByPostIdAndUserId(UUID postId, UUID userId);
    boolean existsByPostIdAndUserId(UUID postId, UUID userId);

    // Count shares for a post
    long countByPostId(UUID postId);

    // Count shares by user
    long countByUserId(UUID userId);

    // Count shares by type
    long countByShareType(PostShare.ShareType shareType);

    // Recent shares across all posts
    @Query("SELECT ps FROM PostShare ps ORDER BY ps.createdAt DESC")
    Page<PostShare> findRecentShares(Pageable pageable);

    // Quote shares (shares with additional content)
    @Query("SELECT ps FROM PostShare ps WHERE ps.shareType = 'QUOTE' AND ps.content IS NOT NULL ORDER BY ps.createdAt DESC")
    Page<PostShare> findQuoteShares(Pageable pageable);

    // Simple reposts (without additional content)
    @Query("SELECT ps FROM PostShare ps WHERE ps.shareType = 'REPOST' ORDER BY ps.createdAt DESC")
    Page<PostShare> findReposts(Pageable pageable);

    // Delete share by post and user
    @Modifying
    @Query("DELETE FROM PostShare ps WHERE ps.post.id = :postId AND ps.user.id = :userId")
    void deleteByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);

    // Delete all shares for a post
    @Modifying
    @Query("DELETE FROM PostShare ps WHERE ps.post.id = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    // Delete all shares by user
    @Modifying
    @Query("DELETE FROM PostShare ps WHERE ps.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    // Find users who shared a post
    @Query("SELECT ps.user.id FROM PostShare ps WHERE ps.post.id = :postId ORDER BY ps.createdAt DESC")
    List<UUID> findUserIdsByPostId(@Param("postId") UUID postId);

    // Bulk operations
    @Modifying
    @Query("DELETE FROM PostShare ps WHERE ps.post.id IN :postIds")
    void deleteByPostIds(@Param("postIds") List<UUID> postIds);
}
