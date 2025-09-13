package com.churchapp.repository;

import com.churchapp.entity.UserFollow;
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
public interface UserFollowRepository extends JpaRepository<UserFollow, UserFollow.UserFollowId> {

    // Find followers of a user
    Page<UserFollow> findById_FollowingIdOrderByCreatedAtDesc(UUID followingId, Pageable pageable);
    List<UserFollow> findById_FollowingIdOrderByCreatedAtDesc(UUID followingId);

    // Find users that a user is following
    Page<UserFollow> findById_FollowerIdOrderByCreatedAtDesc(UUID followerId, Pageable pageable);
    List<UserFollow> findById_FollowerIdOrderByCreatedAtDesc(UUID followerId);

    // Check if user A follows user B
    Optional<UserFollow> findById_FollowerIdAndId_FollowingId(UUID followerId, UUID followingId);
    boolean existsById_FollowerIdAndId_FollowingId(UUID followerId, UUID followingId);

    // Count followers of a user
    long countById_FollowingId(UUID followingId);

    // Count users that a user is following
    long countById_FollowerId(UUID followerId);

    // Get follower IDs for a user
    @Query("SELECT uf.id.followerId FROM UserFollow uf WHERE uf.id.followingId = :followingId")
    List<UUID> findFollowerIdsByFollowingId(@Param("followingId") UUID followingId);

    // Get following IDs for a user
    @Query("SELECT uf.id.followingId FROM UserFollow uf WHERE uf.id.followerId = :followerId")
    List<UUID> findFollowingIdsByFollowerId(@Param("followerId") UUID followerId);

    // Check if users follow each other (mutual following)
    @Query("SELECT COUNT(uf1) > 0 FROM UserFollow uf1, UserFollow uf2 " +
           "WHERE uf1.id.followerId = :userId1 AND uf1.id.followingId = :userId2 " +
           "AND uf2.id.followerId = :userId2 AND uf2.id.followingId = :userId1")
    boolean areUsersMutualFollowing(@Param("userId1") UUID userId1, @Param("userId2") UUID userId2);

    // Delete follow relationship
    @Modifying
    @Query("DELETE FROM UserFollow uf WHERE uf.id.followerId = :followerId AND uf.id.followingId = :followingId")
    void deleteByFollowerIdAndFollowingId(@Param("followerId") UUID followerId, @Param("followingId") UUID followingId);

    // Delete all follows by user (when unfollowing everyone)
    @Modifying
    @Query("DELETE FROM UserFollow uf WHERE uf.id.followerId = :userId")
    void deleteByFollowerId(@Param("userId") UUID userId);

    // Delete all followers of a user (when user is deleted)
    @Modifying
    @Query("DELETE FROM UserFollow uf WHERE uf.id.followingId = :userId")
    void deleteByFollowingId(@Param("userId") UUID userId);

    // Find mutual followers
    @Query("SELECT DISTINCT uf1.id.followerId FROM UserFollow uf1, UserFollow uf2 " +
           "WHERE uf1.id.followingId = :userId AND uf2.id.followerId = :userId " +
           "AND uf1.id.followerId = uf2.id.followingId")
    List<UUID> findMutualFollowerIds(@Param("userId") UUID userId);

    // Find suggested users to follow (users followed by people you follow, but you don't follow)
    @Query("SELECT DISTINCT uf2.id.followingId FROM UserFollow uf1, UserFollow uf2 " +
           "WHERE uf1.id.followerId = :userId AND uf1.id.followingId = uf2.id.followerId " +
           "AND uf2.id.followingId != :userId " +
           "AND NOT EXISTS (SELECT 1 FROM UserFollow uf3 WHERE uf3.id.followerId = :userId AND uf3.id.followingId = uf2.id.followingId)")
    List<UUID> findSuggestedUserIdsToFollow(@Param("userId") UUID userId, Pageable pageable);

    // Bulk operations for cleanup
    @Modifying
    @Query("DELETE FROM UserFollow uf WHERE uf.id.followerId IN :userIds OR uf.id.followingId IN :userIds")
    void deleteByUserIds(@Param("userIds") List<UUID> userIds);
}
