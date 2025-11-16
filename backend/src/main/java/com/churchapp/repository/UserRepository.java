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

    // Organization-scoped DM candidates with optional query and pagination
    @Query("""
        SELECT u
        FROM User u
        WHERE u.primaryOrganization.id = :orgId
          AND u.id <> :excludeUserId
          AND (
                :q IS NULL
             OR LOWER(u.name) LIKE LOWER(CONCAT('%', :q, '%'))
             OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
          )
        """)
    Page<User> findOrgMembersForDm(@Param("orgId") UUID orgId,
                                   @Param("excludeUserId") UUID excludeUserId,
                                   @Param("q") String q,
                                   Pageable pageable);
}