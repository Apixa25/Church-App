package com.churchapp.repository;

import com.churchapp.entity.AccountDeletionRequest;
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
public interface AccountDeletionRequestRepository extends JpaRepository<AccountDeletionRequest, UUID> {

    Optional<AccountDeletionRequest> findByUserId(UUID userId);

    Optional<AccountDeletionRequest> findByConfirmationToken(String confirmationToken);

    List<AccountDeletionRequest> findByStatusOrderByRequestedAtDesc(String status);

    @Query("SELECT adr FROM AccountDeletionRequest adr WHERE adr.status = 'CONFIRMED' AND adr.scheduledDeletionAt <= :now")
    List<AccountDeletionRequest> findReadyForDeletion(@Param("now") LocalDateTime now);

    @Query("SELECT adr FROM AccountDeletionRequest adr WHERE adr.status = 'PENDING' AND adr.requestedAt < :expiryDate")
    List<AccountDeletionRequest> findPendingExpired(@Param("expiryDate") LocalDateTime expiryDate);

    Page<AccountDeletionRequest> findByStatusOrderByRequestedAtDesc(String status, Pageable pageable);

    @Query("SELECT COUNT(adr) FROM AccountDeletionRequest adr WHERE adr.status = :status")
    Long countByStatus(@Param("status") String status);
}

