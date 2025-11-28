package com.churchapp.repository;

import com.churchapp.entity.ContentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContentReportRepository extends JpaRepository<ContentReport, UUID> {

    // Find reports by content
    Page<ContentReport> findByContentTypeAndContentIdOrderByCreatedAtDesc(
        String contentType, UUID contentId, Pageable pageable);

    // Find reports by status
    Page<ContentReport> findByStatusOrderByPriorityDescCreatedAtDesc(
        String status, Pageable pageable);

    // Find reports by content type and status
    Page<ContentReport> findByContentTypeAndStatusOrderByPriorityDescCreatedAtDesc(
        String contentType, String status, Pageable pageable);

    // Find reports with filters
    @Query("SELECT r FROM ContentReport r WHERE " +
           "(:contentType IS NULL OR r.contentType = :contentType) AND " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:priority IS NULL OR r.priority = :priority) " +
           "ORDER BY r.priority DESC, r.createdAt DESC")
    @EntityGraph(attributePaths = {"reporter", "moderatedBy"})
    Page<ContentReport> findWithFilters(
        @Param("contentType") String contentType,
        @Param("status") String status,
        @Param("priority") String priority,
        Pageable pageable);

    // Check if user has already reported this content
    Optional<ContentReport> findByContentTypeAndContentIdAndReporterIdAndStatusIn(
        String contentType, UUID contentId, UUID reporterId, List<String> statuses);

    // Count reports for a specific content item
    long countByContentTypeAndContentId(String contentType, UUID contentId);

    // Count reports by status
    long countByStatus(String status);

    // Find pending reports ordered by priority and creation date
    @Query("SELECT r FROM ContentReport r WHERE r.status = 'PENDING' " +
           "ORDER BY CASE r.priority " +
           "WHEN 'URGENT' THEN 1 " +
           "WHEN 'HIGH' THEN 2 " +
           "WHEN 'MEDIUM' THEN 3 " +
           "WHEN 'LOW' THEN 4 END ASC, r.createdAt ASC")
    Page<ContentReport> findPendingReportsOrderedByPriority(Pageable pageable);
}

