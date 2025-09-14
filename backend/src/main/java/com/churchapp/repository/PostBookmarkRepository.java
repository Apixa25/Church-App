package com.churchapp.repository;

import com.churchapp.entity.PostBookmark;
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
public interface PostBookmarkRepository extends JpaRepository<PostBookmark, PostBookmark.PostBookmarkId> {

    // Find bookmarks by post
    List<PostBookmark> findById_PostIdOrderByCreatedAtDesc(UUID postId);

    // Find bookmarks by user
    Page<PostBookmark> findById_UserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    List<PostBookmark> findById_UserIdOrderByCreatedAtDesc(UUID userId);

    // Check if user bookmarked a specific post
    Optional<PostBookmark> findById_PostIdAndId_UserId(UUID postId, UUID userId);
    boolean existsById_PostIdAndId_UserId(UUID postId, UUID userId);

    // Count bookmarks for a post
    long countById_PostId(UUID postId);

    // Count bookmarks by user
    long countById_UserId(UUID userId);

    // Delete bookmark by post and user
    @Modifying
    @Query("DELETE FROM PostBookmark pb WHERE pb.id.postId = :postId AND pb.id.userId = :userId")
    void deleteByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);

    // Delete all bookmarks for a post
    @Modifying
    @Query("DELETE FROM PostBookmark pb WHERE pb.id.postId = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    // Delete all bookmarks by user
    @Modifying
    @Query("DELETE FROM PostBookmark pb WHERE pb.id.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    // Find recent bookmarks by user
    @Query("SELECT pb FROM PostBookmark pb WHERE pb.id.userId = :userId ORDER BY pb.createdAt DESC")
    List<PostBookmark> findRecentBookmarksByUserId(@Param("userId") UUID userId,
                                                  org.springframework.data.domain.Pageable pageable);

    // Find users who bookmarked a post
    @Query("SELECT pb.id.userId FROM PostBookmark pb WHERE pb.id.postId = :postId ORDER BY pb.createdAt DESC")
    List<UUID> findUserIdsByPostId(@Param("postId") UUID postId);

    // Bulk operations
    @Modifying
    @Query("DELETE FROM PostBookmark pb WHERE pb.id.postId IN :postIds")
    void deleteByPostIds(@Param("postIds") List<UUID> postIds);

    // Find bookmarked posts for user (with post details)
    @Query("SELECT pb FROM PostBookmark pb JOIN FETCH pb.post WHERE pb.id.userId = :userId ORDER BY pb.createdAt DESC")
    Page<PostBookmark> findBookmarksWithPostsByUserId(@Param("userId") UUID userId, Pageable pageable);
}
