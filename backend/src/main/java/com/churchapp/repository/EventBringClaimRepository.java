package com.churchapp.repository;

import com.churchapp.entity.EventBringClaim;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventBringClaimRepository extends JpaRepository<EventBringClaim, UUID> {

    @EntityGraph(attributePaths = {"user"})
    List<EventBringClaim> findByItemId(UUID itemId);

    @EntityGraph(attributePaths = {"user"})
    Optional<EventBringClaim> findByItemIdAndUserId(UUID itemId, UUID userId);

    void deleteByItemIdAndUserId(UUID itemId, UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EventBringClaim c WHERE c.item.event.id = :eventId")
    void deleteByEventId(@Param("eventId") UUID eventId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EventBringClaim c WHERE c.item.id = :itemId")
    void deleteByItemId(@Param("itemId") UUID itemId);
}

