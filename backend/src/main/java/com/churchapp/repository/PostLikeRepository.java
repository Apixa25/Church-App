package com.churchapp.repository;

import com.churchapp.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, PostLike.PostLikeId> {

    // Find likes by post
    List<PostLike> findById_PostIdOrderByCreatedAtDesc(UUID postId);

    // Find likes by user
    List<PostLike> findById_UserIdOrderByCreatedAtDesc(UUID userId);

    // Check if user liked a specific post
    Optional<PostLike> findById_PostIdAndId_UserId(UUID postId, UUID userId);

    // Check if user liked a specific post (boolean)
    boolean existsById_PostIdAndId_UserId(UUID postId, UUID userId);

    // Count likes for a post
    long countById_PostId(UUID postId);

    // Count likes by user
    long countById_UserId(UUID userId);

    // Delete like by post and user
    @Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.id.postId = :postId AND pl.id.userId = :userId")
    void deleteByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);

    // Delete all likes for a post
    @Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.id.postId = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    // Delete all likes by user
    @Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.id.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    // Find recent likes for a post
    @Query("SELECT pl FROM PostLike pl WHERE pl.id.postId = :postId ORDER BY pl.createdAt DESC")
    org.springframework.data.domain.Page<PostLike> findRecentLikesByPostId(@Param("postId") UUID postId,
                                          org.springframework.data.domain.Pageable pageable);

    // Find users who liked a post
    @Query("SELECT pl.id.userId FROM PostLike pl WHERE pl.id.postId = :postId ORDER BY pl.createdAt DESC")
    List<UUID> findUserIdsByPostId(@Param("postId") UUID postId);

    // Bulk delete for cleanup
    @Modifying
    @Query("DELETE FROM PostLike pl WHERE pl.id.postId IN :postIds")
    void deleteByPostIds(@Param("postIds") List<UUID> postIds);
}
