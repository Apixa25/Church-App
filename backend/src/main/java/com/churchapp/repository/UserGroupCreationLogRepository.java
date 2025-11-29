package com.churchapp.repository;

import com.churchapp.entity.UserGroupCreationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface UserGroupCreationLogRepository extends JpaRepository<UserGroupCreationLog, UUID> {
    
    @Query("SELECT COUNT(log) FROM UserGroupCreationLog log " +
           "WHERE log.user.id = :userId " +
           "AND log.createdAt >= :since")
    long countByUserIdSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);
}

