package com.churchapp.repository;

import com.churchapp.entity.GroupInviteLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupInviteLinkRepository extends JpaRepository<GroupInviteLink, UUID> {

    /**
     * Find active invite link by code with group details
     */
    @Query("SELECT gil FROM GroupInviteLink gil " +
           "LEFT JOIN FETCH gil.group g " +
           "LEFT JOIN FETCH gil.createdBy " +
           "WHERE gil.inviteCode = :code AND gil.isActive = true " +
           "AND g.deletedAt IS NULL")
    Optional<GroupInviteLink> findByInviteCodeAndActive(@Param("code") String code);

    /**
     * Find all active links for a group
     */
    @Query("SELECT gil FROM GroupInviteLink gil " +
           "LEFT JOIN FETCH gil.createdBy " +
           "WHERE gil.group.id = :groupId AND gil.isActive = true " +
           "ORDER BY gil.createdAt DESC")
    List<GroupInviteLink> findActiveByGroupId(@Param("groupId") UUID groupId);

    /**
     * Find active link created by a specific user for a group
     */
    Optional<GroupInviteLink> findByGroupIdAndCreatedByIdAndIsActiveTrue(
        UUID groupId, UUID createdById
    );

    /**
     * Increment the use count when someone joins via link
     */
    @Modifying
    @Query("UPDATE GroupInviteLink gil SET gil.useCount = gil.useCount + 1 " +
           "WHERE gil.id = :linkId")
    void incrementUseCount(@Param("linkId") UUID linkId);

    /**
     * Check if invite code exists (for uniqueness validation)
     */
    boolean existsByInviteCode(String inviteCode);
}
