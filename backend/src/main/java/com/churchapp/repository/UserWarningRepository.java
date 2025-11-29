package com.churchapp.repository;

import com.churchapp.entity.UserWarning;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserWarningRepository extends JpaRepository<UserWarning, UUID> {
    
    // Find all warnings for a user, ordered by most recent first
    List<UserWarning> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    // Find warnings for a user with pagination
    Page<UserWarning> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    
    // Find warnings related to specific content
    @Query("SELECT w FROM UserWarning w WHERE w.contentType = :contentType AND w.contentId = :contentId ORDER BY w.createdAt DESC")
    List<UserWarning> findByContentTypeAndContentId(
        @Param("contentType") String contentType, 
        @Param("contentId") UUID contentId
    );
    
    // Count warnings for a user
    long countByUserId(UUID userId);
}

