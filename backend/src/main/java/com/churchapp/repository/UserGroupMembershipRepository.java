package com.churchapp.repository;

import com.churchapp.entity.UserGroupMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserGroupMembershipRepository extends JpaRepository<UserGroupMembership, UUID> {

    @Query("SELECT m FROM UserGroupMembership m WHERE m.user.id = :userId")
    List<UserGroupMembership> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT m FROM UserGroupMembership m WHERE m.group.id = :groupId")
    List<UserGroupMembership> findByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT m FROM UserGroupMembership m WHERE " +
           "m.user.id = :userId AND m.group.id = :groupId")
    Optional<UserGroupMembership> findByUserIdAndGroupId(
        @Param("userId") UUID userId,
        @Param("groupId") UUID groupId
    );

    @Query("SELECT m FROM UserGroupMembership m WHERE " +
           "m.user.id = :userId AND m.isMuted = false")
    List<UserGroupMembership> findUnmutedByUserId(@Param("userId") UUID userId);

    @Query("SELECT m FROM UserGroupMembership m WHERE " +
           "m.user.id = :userId AND m.isMuted = true")
    List<UserGroupMembership> findMutedByUserId(@Param("userId") UUID userId);

    @Query("SELECT m.group.id FROM UserGroupMembership m WHERE " +
           "m.user.id = :userId AND m.isMuted = false")
    List<UUID> findUnmutedGroupIdsByUserId(@Param("userId") UUID userId);

    boolean existsByUserIdAndGroupId(UUID userId, UUID groupId);

    @Modifying
    @Query("UPDATE UserGroupMembership m SET m.isMuted = :muted " +
           "WHERE m.user.id = :userId AND m.group.id = :groupId")
    void updateMuteStatus(
        @Param("userId") UUID userId,
        @Param("groupId") UUID groupId,
        @Param("muted") boolean muted
    );

    @Query("SELECT COUNT(m) FROM UserGroupMembership m WHERE m.group.id = :groupId")
    Long countByGroupId(@Param("groupId") UUID groupId);

    @Query("SELECT m FROM UserGroupMembership m WHERE " +
           "m.group.id = :groupId AND m.role = :role")
    List<UserGroupMembership> findByGroupIdAndRole(
        @Param("groupId") UUID groupId,
        @Param("role") UserGroupMembership.GroupRole role
    );

    @Query("SELECT m FROM UserGroupMembership m WHERE " +
           "m.group.id = :groupId AND m.role = 'CREATOR'")
    Optional<UserGroupMembership> findCreatorByGroupId(@Param("groupId") UUID groupId);
}
