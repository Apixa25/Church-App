package com.churchapp.repository;

import com.churchapp.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("SELECT al FROM AuditLog al WHERE al.userId = :userId ORDER BY al.timestamp DESC")
    Page<AuditLog> findByUserIdOrderByTimestampDesc(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT al FROM AuditLog al WHERE al.action = :action ORDER BY al.timestamp DESC")
    Page<AuditLog> findByActionOrderByTimestampDesc(@Param("action") String action, Pageable pageable);

    @Query("SELECT al FROM AuditLog al WHERE al.timestamp BETWEEN :startDate AND :endDate ORDER BY al.timestamp DESC")
    Page<AuditLog> findByTimestampBetween(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable
    );

    @Query("SELECT al FROM AuditLog al WHERE al.targetType = :targetType AND al.targetId = :targetId ORDER BY al.timestamp DESC")
    List<AuditLog> findByTargetTypeAndTargetIdOrderByTimestampDesc(
        @Param("targetType") String targetType,
        @Param("targetId") UUID targetId
    );

    @Query("SELECT COUNT(al) FROM AuditLog al WHERE al.action = :action AND al.timestamp >= :since")
    Long countByActionSince(@Param("action") String action, @Param("since") LocalDateTime since);

    @Query("SELECT al.action, COUNT(al) FROM AuditLog al WHERE al.timestamp >= :since GROUP BY al.action")
    List<Object[]> getActionCountsSince(@Param("since") LocalDateTime since);

    @Query("SELECT DISTINCT al.action FROM AuditLog al ORDER BY al.action")
    List<String> findDistinctActions();
}