package com.churchapp.repository;

import com.churchapp.entity.UserOrganizationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserOrganizationHistoryRepository extends JpaRepository<UserOrganizationHistory, UUID> {

    @Query("SELECT h FROM UserOrganizationHistory h WHERE h.user.id = :userId " +
           "ORDER BY h.switchedAt DESC")
    List<UserOrganizationHistory> findByUserIdOrderBySwitchedAtDesc(@Param("userId") UUID userId);

    @Query("SELECT h FROM UserOrganizationHistory h WHERE h.user.id = :userId " +
           "ORDER BY h.switchedAt DESC")
    Optional<UserOrganizationHistory> findMostRecentByUserId(@Param("userId") UUID userId);

    @Query("SELECT h FROM UserOrganizationHistory h WHERE " +
           "h.user.id = :userId AND h.switchedAt > :since " +
           "ORDER BY h.switchedAt DESC")
    List<UserOrganizationHistory> findByUserIdSince(
        @Param("userId") UUID userId,
        @Param("since") LocalDateTime since
    );

    @Query("SELECT COUNT(h) FROM UserOrganizationHistory h WHERE " +
           "h.user.id = :userId AND h.switchedAt > :since")
    Long countSwitchesSince(
        @Param("userId") UUID userId,
        @Param("since") LocalDateTime since
    );

    @Query("SELECT h FROM UserOrganizationHistory h WHERE h.toOrganization.id = :orgId")
    List<UserOrganizationHistory> findByToOrganizationId(@Param("orgId") UUID orgId);

    @Query("SELECT h FROM UserOrganizationHistory h WHERE h.fromOrganization.id = :orgId")
    List<UserOrganizationHistory> findByFromOrganizationId(@Param("orgId") UUID orgId);

    // Delete all history records by organization (both from and to)
    @Modifying
    @Query("DELETE FROM UserOrganizationHistory h WHERE " +
           "h.fromOrganization.id = :orgId OR h.toOrganization.id = :orgId")
    void deleteByOrganizationId(@Param("orgId") UUID orgId);
}
