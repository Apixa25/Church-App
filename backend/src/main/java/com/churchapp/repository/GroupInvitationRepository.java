package com.churchapp.repository;

import com.churchapp.entity.GroupInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, UUID> {

    /**
     * Find pending invitations for a user with group and inviter details
     */
    @Query("SELECT gi FROM GroupInvitation gi " +
           "LEFT JOIN FETCH gi.group g " +
           "LEFT JOIN FETCH gi.inviter " +
           "WHERE gi.invitedUser.id = :userId AND gi.status = 'PENDING' " +
           "AND g.deletedAt IS NULL " +
           "ORDER BY gi.createdAt DESC")
    List<GroupInvitation> findPendingByInvitedUserId(@Param("userId") UUID userId);

    /**
     * Find invitations sent by a user for a specific group
     */
    @Query("SELECT gi FROM GroupInvitation gi " +
           "WHERE gi.inviter.id = :inviterId AND gi.group.id = :groupId")
    List<GroupInvitation> findByInviterIdAndGroupId(
        @Param("inviterId") UUID inviterId,
        @Param("groupId") UUID groupId
    );

    /**
     * Check if user already has pending invitation to the group
     */
    @Query("SELECT CASE WHEN COUNT(gi) > 0 THEN true ELSE false END " +
           "FROM GroupInvitation gi " +
           "WHERE gi.group.id = :groupId AND gi.invitedUser.id = :userId " +
           "AND gi.status = 'PENDING'")
    boolean existsPendingInvitation(
        @Param("groupId") UUID groupId,
        @Param("userId") UUID userId
    );

    /**
     * Find specific invitation by group and invited user
     */
    Optional<GroupInvitation> findByGroupIdAndInvitedUserId(UUID groupId, UUID invitedUserId);

    /**
     * Count pending invitations for a user (for badge display)
     */
    @Query("SELECT COUNT(gi) FROM GroupInvitation gi " +
           "WHERE gi.invitedUser.id = :userId AND gi.status = 'PENDING' " +
           "AND gi.group.deletedAt IS NULL")
    Long countPendingByInvitedUserId(@Param("userId") UUID userId);

    /**
     * Find all pending invitations for a specific group
     */
    @Query("SELECT gi FROM GroupInvitation gi " +
           "LEFT JOIN FETCH gi.invitedUser " +
           "LEFT JOIN FETCH gi.inviter " +
           "WHERE gi.group.id = :groupId AND gi.status = 'PENDING' " +
           "ORDER BY gi.createdAt DESC")
    List<GroupInvitation> findPendingByGroupId(@Param("groupId") UUID groupId);
}
