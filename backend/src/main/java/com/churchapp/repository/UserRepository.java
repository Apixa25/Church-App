package com.churchapp.repository;

import com.churchapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByGoogleId(String googleId);
    
    boolean existsByEmail(String email);
    
    boolean existsByGoogleId(String googleId);
    
    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :lastLogin WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") UUID userId, @Param("lastLogin") LocalDateTime lastLogin);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.isActive = true")
    Long countActiveUsers();
    
    @Query("SELECT u FROM User u WHERE u.isActive = true ORDER BY u.createdAt DESC")
    List<User> findAllActiveUsers();
    
    // Dashboard-specific queries
    List<User> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime createdAfter, Pageable pageable);
    
    @Query("SELECT u FROM User u WHERE u.updatedAt > :updatedAfter AND u.updatedAt != u.createdAt ORDER BY u.updatedAt DESC")
    List<User> findByUpdatedAtAfterAndUpdatedAtNotEqualToCreatedAtOrderByUpdatedAtDesc(@Param("updatedAfter") LocalDateTime updatedAfter);
    
    long countByCreatedAtAfter(LocalDateTime createdAfter);

    // Admin-specific queries
    long countByIsActiveAndDeletedAtIsNull(boolean isActive);

    long countByIsBannedTrue();

    long countByRole(User.Role role);

    @Query("SELECT SUM(u.warningCount) FROM User u WHERE u.deletedAt IS NULL")
    Long sumWarningCounts();

    // ========== ORGANIZATION-FILTERED QUERIES (for ORG_ADMIN) ==========
    // These queries JOIN from UserOrganizationMembership to User
    
    @Query("""
        SELECT COUNT(DISTINCT m.user) FROM UserOrganizationMembership m 
        WHERE m.organization.id IN :orgIds
        """)
    long countUsersInOrganizations(@Param("orgIds") List<UUID> orgIds);
    
    @Query("""
        SELECT COUNT(DISTINCT m.user) FROM UserOrganizationMembership m 
        WHERE m.organization.id IN :orgIds 
        AND m.user.isActive = true 
        AND m.user.deletedAt IS NULL
        """)
    long countActiveUsersInOrganizations(@Param("orgIds") List<UUID> orgIds);
    
    @Query("""
        SELECT COUNT(DISTINCT m.user) FROM UserOrganizationMembership m 
        WHERE m.organization.id IN :orgIds 
        AND m.user.createdAt > :since
        """)
    long countNewUsersInOrganizationsSince(@Param("orgIds") List<UUID> orgIds, @Param("since") LocalDateTime since);
    
    @Query("""
        SELECT COUNT(DISTINCT m.user) FROM UserOrganizationMembership m 
        WHERE m.organization.id IN :orgIds 
        AND m.user.isBanned = true
        """)
    long countBannedUsersInOrganizations(@Param("orgIds") List<UUID> orgIds);
    
    @Query("""
        SELECT SUM(m.user.warningCount) FROM UserOrganizationMembership m 
        WHERE m.organization.id IN :orgIds 
        AND m.user.deletedAt IS NULL
        """)
    Long sumWarningCountsInOrganizations(@Param("orgIds") List<UUID> orgIds);

    // Organization-scoped DM candidates with optional query and pagination
    // NOTE: Updated to use churchPrimaryOrganization for Dual Primary System
    @Query("""
        SELECT u
        FROM User u
        WHERE u.churchPrimaryOrganization.id = :orgId
          AND u.id <> :excludeUserId
          AND (
                :qLike IS NULL
             OR LOWER(u.name) LIKE :qLike
             OR LOWER(u.email) LIKE :qLike
          )
        """)
    Page<User> findOrgMembersForDm(@Param("orgId") UUID orgId,
                                   @Param("excludeUserId") UUID excludeUserId,
                                   @Param("qLike") String qLike,
                                   Pageable pageable);

    @Query("SELECT u.churchPrimaryOrganization.id FROM User u WHERE u.id = :userId")
    UUID findChurchPrimaryOrgIdByUserId(@Param("userId") UUID userId);
    
    @Query("SELECT u.familyPrimaryOrganization.id FROM User u WHERE u.id = :userId")
    UUID findFamilyPrimaryOrgIdByUserId(@Param("userId") UUID userId);

    // Update users' church primary organization to Global when their org is deleted
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET church_primary_organization_id = :globalOrgId " +
           "WHERE church_primary_organization_id = :orgId", nativeQuery = true)
    void updateChurchPrimaryOrganizationToGlobal(
        @Param("orgId") UUID orgId,
        @Param("globalOrgId") UUID globalOrgId
    );
    
    // Clear family primary when family org is deleted (no global fallback for families)
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE users SET family_primary_organization_id = NULL " +
           "WHERE family_primary_organization_id = :orgId", nativeQuery = true)
    void clearFamilyPrimaryOrganization(@Param("orgId") UUID orgId);
    
    // ========== SINGLE ORGANIZATION QUERIES (for user dashboard) ==========
    // NOTE: Updated to use churchPrimaryOrganization for Dual Primary System
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.churchPrimaryOrganization.id = :orgId")
    long countByChurchPrimaryOrganizationId(@Param("orgId") UUID orgId);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.churchPrimaryOrganization.id = :orgId AND u.createdAt > :since")
    long countByChurchPrimaryOrganizationIdAndCreatedAtAfter(@Param("orgId") UUID orgId, @Param("since") LocalDateTime since);
    
    @Query("SELECT u FROM User u WHERE u.churchPrimaryOrganization.id = :orgId AND u.createdAt > :createdAfter ORDER BY u.createdAt DESC")
    List<User> findByChurchPrimaryOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(
        @Param("orgId") UUID orgId,
        @Param("createdAfter") LocalDateTime createdAfter,
        Pageable pageable
    );
    
    @Query("SELECT u FROM User u WHERE u.churchPrimaryOrganization.id = :orgId AND u.updatedAt > :updatedAfter AND u.updatedAt != u.createdAt ORDER BY u.updatedAt DESC")
    List<User> findByChurchPrimaryOrganizationIdAndUpdatedAtAfterAndUpdatedAtNotEqualToCreatedAtOrderByUpdatedAtDesc(
        @Param("orgId") UUID orgId,
        @Param("updatedAfter") LocalDateTime updatedAfter
    );
    
    // Family organization queries
    @Query("SELECT COUNT(u) FROM User u WHERE u.familyPrimaryOrganization.id = :orgId")
    long countByFamilyPrimaryOrganizationId(@Param("orgId") UUID orgId);
}