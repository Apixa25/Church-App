package com.churchapp.repository;

import com.churchapp.entity.UserOrganizationMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserOrganizationMembershipRepository extends JpaRepository<UserOrganizationMembership, UUID> {

    @Query("SELECT m FROM UserOrganizationMembership m WHERE m.user.id = :userId")
    List<UserOrganizationMembership> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT m FROM UserOrganizationMembership m WHERE m.organization.id = :orgId")
    List<UserOrganizationMembership> findByOrganizationId(@Param("orgId") UUID orgId);

    @Query("SELECT m FROM UserOrganizationMembership m WHERE " +
           "m.user.id = :userId AND m.organization.id = :orgId")
    Optional<UserOrganizationMembership> findByUserIdAndOrganizationId(
        @Param("userId") UUID userId,
        @Param("orgId") UUID orgId
    );

    @Query("SELECT m FROM UserOrganizationMembership m WHERE " +
           "m.user.id = :userId AND m.isPrimary = true")
    Optional<UserOrganizationMembership> findPrimaryByUserId(@Param("userId") UUID userId);

    @Query("SELECT m FROM UserOrganizationMembership m WHERE " +
           "m.user.id = :userId AND m.isPrimary = false")
    List<UserOrganizationMembership> findSecondaryMembershipsByUserId(@Param("userId") UUID userId);

    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);

    @Modifying
    @Query("UPDATE UserOrganizationMembership m SET m.isPrimary = false " +
           "WHERE m.user.id = :userId AND m.isPrimary = true")
    void clearPrimaryForUser(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE UserOrganizationMembership m SET m.isPrimary = true " +
           "WHERE m.user.id = :userId AND m.organization.id = :orgId")
    void setPrimaryForUserAndOrg(@Param("userId") UUID userId, @Param("orgId") UUID orgId);

    @Query("SELECT COUNT(m) FROM UserOrganizationMembership m WHERE m.organization.id = :orgId")
    Long countByOrganizationId(@Param("orgId") UUID orgId);

    @Query("SELECT COUNT(m) FROM UserOrganizationMembership m WHERE " +
           "m.organization.id = :orgId AND m.isPrimary = true")
    Long countPrimaryMembersByOrganizationId(@Param("orgId") UUID orgId);

    @Query("SELECT m FROM UserOrganizationMembership m WHERE " +
           "m.organization.id = :orgId AND m.role = :role")
    List<UserOrganizationMembership> findByOrganizationIdAndRole(
        @Param("orgId") UUID orgId,
        @Param("role") UserOrganizationMembership.OrgRole role
    );
}
