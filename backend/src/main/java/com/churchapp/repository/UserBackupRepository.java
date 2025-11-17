package com.churchapp.repository;

import com.churchapp.entity.UserBackup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBackupRepository extends JpaRepository<UserBackup, UUID> {

    Optional<UserBackup> findByBackupId(String backupId);

    List<UserBackup> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<UserBackup> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT ub FROM UserBackup ub WHERE ub.status = :status")
    List<UserBackup> findByStatus(@Param("status") String status);

    @Query("SELECT ub FROM UserBackup ub WHERE ub.expiresAt IS NOT NULL AND ub.expiresAt <= :now")
    List<UserBackup> findExpiredBackups(@Param("now") LocalDateTime now);

    @Query("SELECT ub FROM UserBackup ub WHERE ub.userId = :userId AND ub.status = 'COMPLETED' ORDER BY ub.createdAt DESC")
    List<UserBackup> findCompletedBackupsByUser(@Param("userId") UUID userId);

    Optional<UserBackup> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);
}

