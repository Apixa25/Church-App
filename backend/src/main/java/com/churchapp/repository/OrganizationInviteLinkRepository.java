package com.churchapp.repository;

import com.churchapp.entity.OrganizationInviteLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationInviteLinkRepository extends JpaRepository<OrganizationInviteLink, UUID> {

    /** Active link by code, with organization + creator eagerly loaded (org must not be soft-deleted). */
    @Query("SELECT l FROM OrganizationInviteLink l " +
           "LEFT JOIN FETCH l.organization o " +
           "LEFT JOIN FETCH l.createdBy " +
           "WHERE l.inviteCode = :code AND l.isActive = true " +
           "AND o.deletedAt IS NULL")
    Optional<OrganizationInviteLink> findByInviteCodeAndActive(@Param("code") String code);

    @Query("SELECT l FROM OrganizationInviteLink l " +
           "LEFT JOIN FETCH l.organization " +
           "LEFT JOIN FETCH l.createdBy " +
           "WHERE l.organization.id = :orgId AND l.isActive = true " +
           "ORDER BY l.createdAt DESC")
    List<OrganizationInviteLink> findActiveByOrganizationId(@Param("orgId") UUID orgId);

    @Modifying
    @Query("UPDATE OrganizationInviteLink l SET l.useCount = l.useCount + 1 WHERE l.id = :linkId")
    void incrementUseCount(@Param("linkId") UUID linkId);

    boolean existsByInviteCode(String inviteCode);
}
