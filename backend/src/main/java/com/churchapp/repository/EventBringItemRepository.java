package com.churchapp.repository;

import com.churchapp.entity.EventBringItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventBringItemRepository extends JpaRepository<EventBringItem, UUID> {

    @EntityGraph(attributePaths = {"claims", "claims.user", "createdBy"})
    List<EventBringItem> findByEventIdOrderByCreatedAtAsc(UUID eventId);

    @EntityGraph(attributePaths = {"claims", "claims.user", "createdBy"})
    Optional<EventBringItem> findByIdAndEventId(UUID id, UUID eventId);

    void deleteByEventId(UUID eventId);
}

