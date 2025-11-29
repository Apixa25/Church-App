package com.churchapp.repository;

import com.churchapp.entity.EventBringItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventBringItemRepository extends JpaRepository<EventBringItem, UUID> {

    @EntityGraph(attributePaths = {"claims", "claims.user", "createdBy"})
    List<EventBringItem> findByEventIdOrderByCreatedAtAsc(UUID eventId);

    @EntityGraph(attributePaths = {"claims", "claims.user", "createdBy"})
    Optional<EventBringItem> findByIdAndEventId(UUID id, UUID eventId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM EventBringItem ebi WHERE ebi.event.id = :eventId")
    void deleteByEventId(@Param("eventId") UUID eventId);
}

