package com.churchapp.service;

import com.churchapp.dto.EventBringClaimRequest;
import com.churchapp.dto.EventBringClaimResponse;
import com.churchapp.dto.EventBringItemRequest;
import com.churchapp.dto.EventBringItemResponse;
import com.churchapp.entity.Event;
import com.churchapp.entity.EventBringClaim;
import com.churchapp.entity.EventBringItem;
import com.churchapp.entity.User;
import com.churchapp.repository.EventBringClaimRepository;
import com.churchapp.repository.EventBringItemRepository;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EventBringListService {

    private final EventRepository eventRepository;
    private final EventBringItemRepository bringItemRepository;
    private final EventBringClaimRepository bringClaimRepository;
    private final UserRepository userRepository;

    public List<EventBringItemResponse> getBringItems(UUID eventId, UUID currentUserId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        if (!Boolean.TRUE.equals(event.getBringListEnabled())) {
            return Collections.emptyList();
        }

        User currentUser = currentUserId != null
            ? userRepository.findById(currentUserId).orElse(null)
            : null;

        boolean canManageAll = currentUser != null && (
            event.getCreator().getId().equals(currentUserId) ||
            currentUser.getRole() == User.Role.PLATFORM_ADMIN ||
            currentUser.getRole() == User.Role.MODERATOR
        );

        return bringItemRepository.findByEventIdOrderByCreatedAtAsc(eventId).stream()
            .map(item -> {
                boolean canEdit = canManageAll ||
                    (currentUserId != null && item.getCreatedBy() != null &&
                        item.getCreatedBy().getId().equals(currentUserId));
                return EventBringItemResponse.fromEntity(item, currentUserId, canEdit);
            })
            .collect(Collectors.toList());
    }

    public void seedBringItems(Event event, User creator, List<EventBringItemRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }

        if (!Boolean.TRUE.equals(event.getBringListEnabled())) {
            log.debug("Skipping bring list seeding because bring list is disabled for event {}", event.getId());
            return;
        }

        List<EventBringItem> existingItems = bringItemRepository.findByEventIdOrderByCreatedAtAsc(event.getId());
        Set<String> existingNames = existingItems.stream()
            .map(existing -> existing.getName() != null ? existing.getName().trim().toLowerCase() : "")
            .collect(Collectors.toCollection(HashSet::new));

        requests.stream()
            .filter(request -> request.getName() != null && !request.getName().trim().isEmpty())
            .forEach(request -> {
                validateItemRequest(request);
                String normalized = request.getName().trim().toLowerCase();
                if (existingNames.contains(normalized)) {
                    log.debug("Skipping duplicate bring item '{}' for event {}", request.getName(), event.getId());
                    return;
                }

                EventBringItem item = buildItemFromRequest(event, creator, request);
                bringItemRepository.save(item);
                existingNames.add(normalized);
            });
    }

    public EventBringItemResponse addItem(UUID eventId, UUID userId, EventBringItemRequest request) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        if (!Boolean.TRUE.equals(event.getBringListEnabled())) {
            throw new RuntimeException("Bring list is not enabled for this event");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        validateItemRequest(request);

        EventBringItem item = buildItemFromRequest(event, user, request);
        EventBringItem saved = bringItemRepository.save(item);

        return EventBringItemResponse.fromEntity(saved, userId, true);
    }

    public EventBringItemResponse updateItem(UUID eventId, UUID itemId, UUID userId, EventBringItemRequest request) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        EventBringItem item = bringItemRepository.findByIdAndEventId(itemId, eventId)
            .orElseThrow(() -> new RuntimeException("Bring item not found for this event"));

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (!canEditItem(event, item, user)) {
            throw new RuntimeException("Not authorized to update this item");
        }

        if (request.getName() != null) {
            if (request.getName().trim().isEmpty()) {
                throw new RuntimeException("Item name cannot be empty");
            }
            item.setName(request.getName().trim());
        }

        if (request.getDescription() != null) {
            item.setDescription(request.getDescription().trim());
        }

        if (request.getQuantityNeeded() != null) {
            if (request.getQuantityNeeded() < 1) {
                throw new RuntimeException("Quantity needed must be at least 1");
            }
            item.setQuantityNeeded(request.getQuantityNeeded());
        }

        if (request.getAllowMultipleClaims() != null) {
            item.setAllowMultipleClaims(request.getAllowMultipleClaims());
        }

        EventBringItem saved = bringItemRepository.save(item);
        return EventBringItemResponse.fromEntity(saved, userId, true);
    }

    public void deleteItem(UUID eventId, UUID itemId, UUID userId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        EventBringItem item = bringItemRepository.findByIdAndEventId(itemId, eventId)
            .orElseThrow(() -> new RuntimeException("Bring item not found for this event"));

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        if (!canEditItem(event, item, user)) {
            throw new RuntimeException("Not authorized to delete this item");
        }

        bringItemRepository.delete(item);
    }

    public EventBringClaimResponse upsertClaim(UUID eventId, UUID itemId, UUID userId, EventBringClaimRequest request) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        if (!Boolean.TRUE.equals(event.getBringListEnabled())) {
            throw new RuntimeException("Bring list is not enabled for this event");
        }

        EventBringItem item = bringItemRepository.findByIdAndEventId(itemId, eventId)
            .orElseThrow(() -> new RuntimeException("Bring item not found for this event"));

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

        int requestedQuantity = request.getQuantity() != null ? request.getQuantity() : 1;
        if (requestedQuantity < 1) {
            throw new RuntimeException("Claim quantity must be at least 1");
        }

        List<EventBringClaim> existingClaims = bringClaimRepository.findByItemId(itemId);

        if (!Boolean.TRUE.equals(item.getAllowMultipleClaims())) {
            boolean hasOtherClaim = existingClaims.stream()
                .anyMatch(claim -> !claim.getUser().getId().equals(userId));
            if (hasOtherClaim) {
                throw new RuntimeException("This item is already claimed by someone else");
            }
        }

        int claimedQuantity = existingClaims.stream()
            .filter(claim -> !claim.getUser().getId().equals(userId))
            .mapToInt(claim -> claim.getQuantity() != null ? claim.getQuantity() : 0)
            .sum();

        if (item.getQuantityNeeded() != null) {
            int available = item.getQuantityNeeded() - claimedQuantity;
            if (requestedQuantity > available) {
                throw new RuntimeException("Not enough quantity remaining to claim");
            }
        }

        EventBringClaim claim = existingClaims.stream()
            .filter(existing -> existing.getUser().getId().equals(userId))
            .findFirst()
            .orElseGet(() -> EventBringClaim.builder()
                .item(item)
                .user(user)
                .build());

        claim.setQuantity(requestedQuantity);
        claim.setNote(request.getNote() != null ? request.getNote().trim() : null);

        EventBringClaim saved = bringClaimRepository.save(claim);
        return EventBringClaimResponse.fromEntity(saved);
    }

    public void deleteClaim(UUID eventId, UUID itemId, UUID userId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));

        if (!Boolean.TRUE.equals(event.getBringListEnabled())) {
            return;
        }

        EventBringItem item = bringItemRepository.findByIdAndEventId(itemId, eventId)
            .orElseThrow(() -> new RuntimeException("Bring item not found for this event"));

        bringClaimRepository.findByItemIdAndUserId(item.getId(), userId)
            .ifPresent(bringClaimRepository::delete);
    }

    private EventBringItem buildItemFromRequest(Event event, User user, EventBringItemRequest request) {
        EventBringItem item = new EventBringItem();
        item.setEvent(event);
        item.setName(request.getName().trim());
        item.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);
        item.setQuantityNeeded(request.getQuantityNeeded());
        item.setAllowMultipleClaims(request.getAllowMultipleClaims() != null ? request.getAllowMultipleClaims() : true);
        item.setCreatedBy(user);
        return item;
    }

    private void validateItemRequest(EventBringItemRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("Item name is required");
        }

        if (request.getQuantityNeeded() != null && request.getQuantityNeeded() < 1) {
            throw new RuntimeException("Quantity needed must be at least 1");
        }
    }

    private boolean canEditItem(Event event, EventBringItem item, User user) {
        if (user == null) {
            return false;
        }

        if (item.getCreatedBy() != null && item.getCreatedBy().getId().equals(user.getId())) {
            return true;
        }

        return canManageAll(event, user);
    }

    private boolean canManageAll(Event event, User user) {
        return event.getCreator().getId().equals(user.getId()) ||
            user.getRole() == User.Role.PLATFORM_ADMIN ||
            user.getRole() == User.Role.MODERATOR;
    }

    public void deleteAllItemsForEvent(UUID eventId) {
        bringItemRepository.deleteByEventId(eventId);
    }
}

