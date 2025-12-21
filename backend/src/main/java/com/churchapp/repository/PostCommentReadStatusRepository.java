package com.churchapp.repository;

import com.churchapp.entity.PostCommentReadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostCommentReadStatusRepository extends JpaRepository<PostCommentReadStatus, UUID> {

    /**
     * Find read status for a specific user and post
     */
    Optional<PostCommentReadStatus> findByUserIdAndPostId(UUID userId, UUID postId);

    /**
     * Get new comment counts for multiple posts (batch operation for feed)
     * Returns map of postId -> newCommentCount
     *
     * Query logic:
     * - For each post in the list
     * - Count comments created AFTER the user's last_read_at timestamp
     * - If user never read the post (no entry in table), count ALL comments
     */
    @Query("""
        SELECT pc.post.id as postId, COUNT(pc) as newCount
        FROM PostComment pc
        LEFT JOIN PostCommentReadStatus rs
            ON rs.postId = pc.post.id
            AND rs.userId = :userId
        WHERE pc.post.id IN :postIds
        AND (rs.lastReadAt IS NULL OR pc.createdAt > rs.lastReadAt)
        GROUP BY pc.post.id
        """)
    List<Map<String, Object>> getNewCommentCounts(
        @Param("userId") UUID userId,
        @Param("postIds") List<UUID> postIds
    );

    /**
     * Mark post as read (upsert operation)
     * If entry exists, update last_read_at
     * If entry doesn't exist, insert new entry
     */
    @Modifying
    @Query(value = """
        INSERT INTO post_comment_read_status (id, user_id, post_id, last_read_at, created_at, updated_at)
        VALUES (gen_random_uuid(), :userId, :postId, :timestamp, NOW(), NOW())
        ON CONFLICT (user_id, post_id)
        DO UPDATE SET last_read_at = :timestamp, updated_at = NOW()
        """, nativeQuery = true)
    void markPostAsRead(
        @Param("userId") UUID userId,
        @Param("postId") UUID postId,
        @Param("timestamp") LocalDateTime timestamp
    );

    /**
     * Delete read status entries for a specific user
     */
    @Modifying
    @Query("DELETE FROM PostCommentReadStatus rs WHERE rs.userId = :userId")
    void deleteByUserId(@Param("userId") UUID userId);

    /**
     * Delete read status entries for a specific post
     */
    @Modifying
    @Query("DELETE FROM PostCommentReadStatus rs WHERE rs.postId = :postId")
    void deleteByPostId(@Param("postId") UUID postId);

    /**
     * Clean up old read status entries (older than X days)
     * Helps keep table size manageable
     */
    @Modifying
    @Query("DELETE FROM PostCommentReadStatus rs WHERE rs.updatedAt < :cutoffDate")
    void deleteOldReadStatuses(@Param("cutoffDate") LocalDateTime cutoffDate);
}
