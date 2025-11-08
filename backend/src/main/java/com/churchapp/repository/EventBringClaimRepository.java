package com.churchapp.repository;

import com.churchapp.entity.EventBringClaim;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventBringClaimRepository extends JpaRepository<EventBringClaim, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<EventBringClaim> findByItemId(UUID itemId);

    @EntityGraph(attributePaths = {"user"})
    Optional<EventBringClaim> findByItemIdAndUserId(UUID itemId, UUID userId);

    void deleteByItemIdAndUserId(UUID itemId, UUID userId);

    void deleteByItemId(UUID itemId);
}

