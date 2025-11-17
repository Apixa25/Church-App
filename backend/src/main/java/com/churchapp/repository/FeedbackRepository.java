package com.churchapp.repository;

import com.churchapp.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    Optional<Feedback> findByTicketId(String ticketId);

    List<Feedback> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<Feedback> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<Feedback> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    Page<Feedback> findByTypeOrderByCreatedAtDesc(String type, Pageable pageable);

    @Query("SELECT f FROM Feedback f WHERE f.status = :status AND f.createdAt >= :since")
    List<Feedback> findRecentByStatus(@Param("status") String status, @Param("since") java.time.LocalDateTime since);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.status = :status")
    Long countByStatus(@Param("status") String status);

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.type = :type")
    Long countByType(@Param("type") String type);
}

