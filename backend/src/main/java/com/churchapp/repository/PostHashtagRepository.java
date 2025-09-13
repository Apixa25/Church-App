package com.churchapp.repository;

import com.churchapp.entity.PostHashtag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostHashtagRepository extends JpaRepository<PostHashtag, PostHashtag.PostHashtagId> {

    // Find hashtags for a post
    List<PostHashtag> findById_PostId(UUID postId);

    // Find posts for a hashtag
    List<PostHashtag> findById_HashtagId(UUID hashtagId);

    // Check if post has specific hashtag
    boolean existsById_PostIdAndId_HashtagId(UUID postId, UUID hashtagId);

    // Count posts using a hashtag
    long countById_HashtagId(UUID hashtagId);

    // Count hashtags used in a post
    long countById_PostId(UUID postId);

    // Delete hashtag associations for a post
    @Modifying
    @Query("DELETE FROM PostHashtag ph WHERE ph.id.postId = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    // Delete hashtag associations for a hashtag
    @Modifying
    @Query("DELETE FROM PostHashtag ph WHERE ph.id.hashtagId = :hashtagId")
    void deleteByHashtagId(@Param("hashtagId") UUID hashtagId);

    // Find posts with specific hashtag (with pagination)
    @Query("SELECT ph.id.postId FROM PostHashtag ph WHERE ph.id.hashtagId = :hashtagId ORDER BY ph.id.postId")
    List<UUID> findPostIdsByHashtagId(@Param("hashtagId") UUID hashtagId,
                                    org.springframework.data.domain.Pageable pageable);

    // Find hashtags used in specific posts
    @Query("SELECT ph.id.hashtagId FROM PostHashtag ph WHERE ph.id.postId IN :postIds")
    List<UUID> findHashtagIdsByPostIds(@Param("postIds") List<UUID> postIds);

    // Get hashtag usage statistics
    @Query("SELECT ph.id.hashtagId, COUNT(ph) as usageCount FROM PostHashtag ph GROUP BY ph.id.hashtagId ORDER BY usageCount DESC")
    List<Object[]> getHashtagUsageStatistics();

    // Bulk operations
    @Modifying
    @Query("DELETE FROM PostHashtag ph WHERE ph.id.postId IN :postIds")
    void deleteByPostIds(@Param("postIds") List<UUID> postIds);

    @Modifying
    @Query("DELETE FROM PostHashtag ph WHERE ph.id.hashtagId IN :hashtagIds")
    void deleteByHashtagIds(@Param("hashtagIds") List<UUID> hashtagIds);

    // Find posts that have multiple hashtags
    @Query("SELECT DISTINCT ph1.id.postId FROM PostHashtag ph1, PostHashtag ph2 " +
           "WHERE ph1.id.postId = ph2.id.postId AND ph1.id.hashtagId = :hashtagId1 AND ph2.id.hashtagId = :hashtagId2")
    List<UUID> findPostsWithMultipleHashtags(@Param("hashtagId1") UUID hashtagId1,
                                           @Param("hashtagId2") UUID hashtagId2);

    // Delete specific hashtag association
    @Modifying
    @Query("DELETE FROM PostHashtag ph WHERE ph.id.postId = :postId AND ph.id.hashtagId = :hashtagId")
    void deleteByPostIdAndHashtagId(@Param("postId") UUID postId, @Param("hashtagId") UUID hashtagId);
}
