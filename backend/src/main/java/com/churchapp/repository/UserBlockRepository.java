package com.churchapp.repository;

import com.churchapp.entity.UserBlock;
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
public interface UserBlockRepository extends JpaRepository<UserBlock, UserBlock.UserBlockId> {

    // Check if user A blocks user B
    Optional<UserBlock> findById_BlockerIdAndId_BlockedId(UUID blockerId, UUID blockedId);
    boolean existsById_BlockerIdAndId_BlockedId(UUID blockerId, UUID blockedId);

    // Get all users blocked by a user
    Page<UserBlock> findById_BlockerIdOrderByCreatedAtDesc(UUID blockerId, Pageable pageable);
    List<UserBlock> findById_BlockerIdOrderByCreatedAtDesc(UUID blockerId);

    // Get all users who block a specific user
    Page<UserBlock> findById_BlockedIdOrderByCreatedAtDesc(UUID blockedId, Pageable pageable);
    List<UserBlock> findById_BlockedIdOrderByCreatedAtDesc(UUID blockedId);

    // Get list of user IDs blocked by a user (for feed filtering)
    @Query("SELECT ub.id.blockedId FROM UserBlock ub WHERE ub.id.blockerId = :blockerId")
    List<UUID> findBlockedIdsByBlockerId(@Param("blockerId") UUID blockerId);

    // Get list of user IDs who block a specific user
    @Query("SELECT ub.id.blockerId FROM UserBlock ub WHERE ub.id.blockedId = :blockedId")
    List<UUID> findBlockerIdsByBlockedId(@Param("blockedId") UUID blockedId);

    // Delete block relationship
    @Modifying
    @Query("DELETE FROM UserBlock ub WHERE ub.id.blockerId = :blockerId AND ub.id.blockedId = :blockedId")
    void deleteByBlockerIdAndBlockedId(@Param("blockerId") UUID blockerId, @Param("blockedId") UUID blockedId);

    // Delete all blocks by a user (when user is deleted)
    @Modifying
    @Query("DELETE FROM UserBlock ub WHERE ub.id.blockerId = :userId")
    void deleteByBlockerId(@Param("userId") UUID userId);

    // Delete all blocks of a user (when user is deleted)
    @Modifying
    @Query("DELETE FROM UserBlock ub WHERE ub.id.blockedId = :userId")
    void deleteByBlockedId(@Param("userId") UUID userId);

    // Check if any of the provided users are blocked by the blocker
    @Query("SELECT ub.id.blockedId FROM UserBlock ub WHERE ub.id.blockerId = :blockerId AND ub.id.blockedId IN :userIds")
    List<UUID> findBlockedIdsByBlockerIdAndUserIds(@Param("blockerId") UUID blockerId, @Param("userIds") List<UUID> userIds);

    // Count how many users a user has blocked
    long countById_BlockerId(UUID blockerId);

    // Count how many users have blocked a specific user
    long countById_BlockedId(UUID blockedId);
}

