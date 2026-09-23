package com.churchapp.service;

import com.churchapp.dto.EventBringItemRequest;
import com.churchapp.dto.EventNotificationEvent;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.Event;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.EventRsvpRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EventService {
    
    private final EventRepository eventRepository;
    private final EventRsvpRepository eventRsvpRepository;
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final EventBringListService eventBringListService;
    private final UserOrganizationMembershipRepository membershipRepository;
    private final ChurchPrimaryResolver churchPrimaryResolver;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    public Event createEvent(UUID creatorId, Event eventRequest, Boolean bringListEnabled, List<EventBringItemRequest> bringItems, UUID organizationId) {
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + creatorId));

        Organization targetOrganization = churchPrimaryResolver.resolveCalendarEntryHome(creator, organizationId);
        if (creator.getRole() != User.Role.PLATFORM_ADMIN
                && !membershipRepository.existsByUserIdAndOrganizationId(creatorId, targetOrganization.getId())) {
            throw new RuntimeException("You are not a member of this church or family.");
        }

        log.info("Creating event - Title: '{}', StartTime: '{}', EndTime: '{}', Category: '{}', Status: '{}', Organization: '{}'",
                eventRequest.getTitle(), eventRequest.getStartTime(), eventRequest.getEndTime(),
                eventRequest.getCategory(), eventRequest.getStatus(), targetOrganization.getId());

        Event event = new Event();
        event.setTitle(eventRequest.getTitle().trim());
        event.setDescription(eventRequest.getDescription() != null ? eventRequest.getDescription().trim() : null);
        event.setStartTime(eventRequest.getStartTime());
        event.setEndTime(eventRequest.getEndTime());
        event.setLocation(eventRequest.getLocation() != null ? eventRequest.getLocation().trim() : null);
        event.setCreator(creator);
        event.setOrganization(targetOrganization); // Always org-scoped
        Event.EventCategory category = eventRequest.getCategory() != null
            ? eventRequest.getCategory()
            : Event.EventCategory.GENERAL;
        event.setCategory(category);
        event.setOriginalCategory(category.name());
        event.setMaxAttendees(eventRequest.getMaxAttendees());
        event.setIsRecurring(eventRequest.getIsRecurring() != null ? eventRequest.getIsRecurring() : false);
        event.setRecurrenceType(eventRequest.getRecurrenceType());
        event.setRecurrenceEndDate(eventRequest.getRecurrenceEndDate());
        event.setRequiresApproval(eventRequest.getRequiresApproval() != null ? eventRequest.getRequiresApproval() : false);
        event.setBringListEnabled(bringListEnabled != null ? bringListEnabled : Boolean.FALSE);
        event.setStatus(Event.EventStatus.SCHEDULED);
        
        // Fix recurring event validation - if isRecurring is true but no recurrenceType, set to false
        if (event.getIsRecurring() && event.getRecurrenceType() == null) {
            log.warn("Event marked as recurring but no recurrence type specified. Setting isRecurring to false.");
            event.setIsRecurring(false);
        }
        
        // Fix date validation - ensure end time is after start time if both are provided
        if (event.getEndTime() != null && event.getStartTime() != null) {
            if (event.getEndTime().isBefore(event.getStartTime()) || event.getEndTime().isEqual(event.getStartTime())) {
                log.warn("End time is before or equal to start time. Adjusting end time to be 1 hour after start time.");
                event.setEndTime(event.getStartTime().plusHours(1));
            }
        }
        
        log.info("About to save event with final values - StartTime: '{}', EndTime: '{}', MaxAttendees: '{}', IsRecurring: '{}', RecurrenceType: '{}'", 
                event.getStartTime(), event.getEndTime(), event.getMaxAttendees(), event.getIsRecurring(), event.getRecurrenceType());
        
        // Set group if provided
        if (eventRequest.getGroup() != null && eventRequest.getGroup().getId() != null) {
            ChatGroup group = chatGroupRepository.findById(eventRequest.getGroup().getId())
                .orElseThrow(() -> new RuntimeException("Chat group not found with id: " + eventRequest.getGroup().getId()));
            event.setGroup(group);
        }
        
        Event savedEvent = eventRepository.save(event);
        
        if (Boolean.TRUE.equals(savedEvent.getBringListEnabled()) && bringItems != null && !bringItems.isEmpty()) {
            eventBringListService.seedBringItems(savedEvent, creator, bringItems);
        }
        
        log.info("Event created with id: {} by user: {}", savedEvent.getId(), creatorId);
        
        // Send WebSocket notification for new event
        notifyEventCreated(savedEvent, creator);
        
        return savedEvent;
    }
    
    public Event getEvent(UUID eventId) {
        return eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
    }

    /**
     * Church and family homes for this person's calendar. A requested id is
     * accepted only when it is one of those homes; the result is still both.
     */
    public List<UUID> calendarOrganizationIds(UUID userId, UUID requestedOrganizationId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return churchPrimaryResolver.personalCalendarOrganizationIds(user, requestedOrganizationId);
    }

    public Event getEventForUser(UUID eventId, UUID userId) {
        Event event = getEvent(eventId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        churchPrimaryResolver.assertCanViewCalendarEvent(user, event.getOrganization());
        Organization organization = event.getOrganization();
        if (organization != null) {
            organization.getId();
            organization.getName();
            if (organization.getType() != null) {
                organization.getType().name();
            }
        }
        return event;
    }

    public Page<Event> getVisibleEvents(List<UUID> organizationIds, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findVisibleByOrganizationIdIn(organizationIds, startDate, endDate, pageable);
    }

    public Page<Event> getEventsForOrganizations(List<UUID> organizationIds, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationIdIn(organizationIds, pageable);
    }
    
    public Event updateEvent(UUID eventId, UUID userId, Event eventUpdate, Boolean bringListEnabled, List<EventBringItemRequest> bringItems) {
        Event existingEvent = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
        
        // Check if user is the creator or has admin/moderator role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (!canManageEvent(user, existingEvent)) {
            throw new RuntimeException("Not authorized to update this event");
        }
        
        // Update fields
        if (eventUpdate.getTitle() != null) {
            existingEvent.setTitle(eventUpdate.getTitle().trim());
        }
        if (eventUpdate.getDescription() != null) {
            existingEvent.setDescription(eventUpdate.getDescription().trim());
        }
        if (eventUpdate.getStartTime() != null) {
            existingEvent.setStartTime(eventUpdate.getStartTime());
        }
        if (eventUpdate.getEndTime() != null) {
            existingEvent.setEndTime(eventUpdate.getEndTime());
        }
        if (eventUpdate.getLocation() != null) {
            existingEvent.setLocation(eventUpdate.getLocation().trim());
        }
        if (eventUpdate.getCategory() != null) {
            existingEvent.setCategory(eventUpdate.getCategory());
            existingEvent.setOriginalCategory(eventUpdate.getCategory().name());
        }
        if (eventUpdate.getIsRecurring() != null) {
            existingEvent.setIsRecurring(eventUpdate.getIsRecurring());
            if (Boolean.FALSE.equals(eventUpdate.getIsRecurring())) {
                existingEvent.setRecurrenceType(null);
                existingEvent.setRecurrenceEndDate(null);
            } else {
                if (eventUpdate.getRecurrenceType() != null) {
                    existingEvent.setRecurrenceType(eventUpdate.getRecurrenceType());
                }
                existingEvent.setRecurrenceEndDate(eventUpdate.getRecurrenceEndDate());
            }
        }
        if (eventUpdate.getRequiresApproval() != null) {
            existingEvent.setRequiresApproval(eventUpdate.getRequiresApproval());
        }
        if (eventUpdate.getStatus() != null) {
            existingEvent.setStatus(eventUpdate.getStatus());
        }
        if (eventUpdate.getMaxAttendees() != null) {
            existingEvent.setMaxAttendees(eventUpdate.getMaxAttendees());
        }
        
        if (bringListEnabled != null) {
            existingEvent.setBringListEnabled(bringListEnabled);
            if (!bringListEnabled) {
                eventBringListService.deleteAllItemsForEvent(existingEvent.getId());
            }
        }
        
        Event updatedEvent = eventRepository.save(existingEvent);
        
        if (Boolean.TRUE.equals(updatedEvent.getBringListEnabled()) && bringItems != null && !bringItems.isEmpty()) {
            eventBringListService.seedBringItems(updatedEvent, user, bringItems);
        }
        
        log.info("Event updated with id: {} by user: {}", eventId, userId);
        
        // Send WebSocket notification - if status changed to CANCELLED, send cancel notification, otherwise send update
        // Pass the already-loaded user to avoid lazy loading issues
        if (eventUpdate.getStatus() != null && eventUpdate.getStatus() == Event.EventStatus.CANCELLED) {
            notifyEventCancelled(updatedEvent, user);
        } else {
            notifyEventUpdated(updatedEvent, user);
        }
        
        return updatedEvent;
    }
    
    public void deleteEvent(UUID eventId, UUID userId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
        
        // Check if user is the creator or has admin role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        log.info("Delete authorization check - Event: {} | Creator: {} | Current User: {} | User Role: {}", 
                eventId, event.getCreator().getId(), userId, user.getRole());
        
        if (!canManageEvent(user, event)) {
            throw new RuntimeException("Not authorized to delete this event. Only the event creator or an administrator of that church or family can delete events.");
        }
        
        // Notify about cancellation before actual deletion (per user requirements)
        notifyEventCancelled(event, user);
        
        // Set status to CANCELLED before deleting (if not already)
        if (event.getStatus() != Event.EventStatus.CANCELLED) {
            event.setStatus(Event.EventStatus.CANCELLED);
            eventRepository.save(event); // Save the status change
        }
        
        // Delete all RSVPs for this event first to avoid foreign key constraint violations
        log.info("Deleting all RSVPs for event: {}", eventId);
        eventRsvpRepository.deleteByEventId(eventId);
        
        // Now delete the event
        eventRepository.delete(event);
        log.info("Event deleted with id: {} by user: {}", eventId, userId);
    }
    
    // Query methods - org-scoped
    public Page<Event> getAllEvents(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findAll(pageable);
    }

    /**
     * Events on the user's church and family calendar.
     */
    public Page<Event> getEventsForUser(UUID userId, UUID organizationId, int page, int size) {
        List<UUID> organizationIds = calendarOrganizationIds(userId, organizationId);
        Page<Event> eventsPage = getEventsForOrganizations(organizationIds, page, size);
        
        // Ensure creator is loaded for all events (force lazy loading within transaction)
        eventsPage.getContent().forEach(event -> {
            if (event.getCreator() != null) {
                // Access creator properties to trigger lazy loading
                event.getCreator().getId();
                event.getCreator().getName();
                event.getCreator().getProfilePicUrl();
            }
        });
        
        return eventsPage;
    }

    /**
     * Get upcoming events for user's active organization
     */
    public List<Event> getUpcomingEventsForUser(UUID userId, UUID organizationId) {
        List<UUID> organizationIds = calendarOrganizationIds(userId, organizationId);
        return eventRepository.findUpcomingByOrganizationIdIn(organizationIds, LocalDateTime.now());
    }

    /**
     * Get events for a specific organization (for admins/analytics)
     */
    public Page<Event> getEventsByOrganization(UUID organizationId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationId(organizationId, pageable);
    }

    public Page<Event> getRecentEvents(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findRecentEventsOrderByCreatedAt(pageable);
    }

    public Page<Event> getUpcomingEvents(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findUpcomingEvents(LocalDateTime.now(), pageable);
    }
    
    public Page<Event> getEventsByCategory(Event.EventCategory category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByCategoryOrderByStartTimeAsc(category, pageable);
    }
    
    public Page<Event> getEventsByStatus(Event.EventStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByStatusOrderByStartTimeAsc(status, pageable);
    }
    
    public Page<Event> getEventsByCreator(UUID creatorId, int page, int size) {
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + creatorId));
        
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByCreator(creator, pageable);
    }
    
    public Page<Event> getEventsByGroup(UUID groupId, int page, int size) {
        ChatGroup group = chatGroupRepository.findById(groupId)
            .orElseThrow(() -> new RuntimeException("Chat group not found with id: " + groupId));
        
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByGroupOrderByStartTimeAsc(group, pageable);
    }
    
    public Page<Event> getEventsByDateRange(UUID organizationId, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationIdAndDateRange(organizationId, startDate, endDate, pageable);
    }

    public Page<Event> getEventsByCategoryForOrganization(UUID organizationId, Event.EventCategory category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationIdAndCategory(organizationId, category, pageable);
    }

    public Page<Event> getEventsByStatusForOrganization(UUID organizationId, Event.EventStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationIdAndStatus(organizationId, status, pageable);
    }
    
    public Page<Event> searchEvents(List<UUID> organizationIds, String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.searchEventsByOrganizationIdIn(organizationIds, searchTerm, pageable);
    }
    
    // Dashboard/Feed methods
    public List<Event> getRecentEventsForFeed(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return eventRepository.findRecentEventsForFeed(LocalDateTime.now(), pageable);
    }
    
    public List<Event> getEventsToday(List<UUID> organizationIds) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        return eventRepository.findEventsTodayByOrganizationIdIn(organizationIds, startOfDay, endOfDay);
    }

    public List<Event> getEventsThisWeek(List<UUID> organizationIds) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekStart = now.withHour(0).withMinute(0).withSecond(0);
        LocalDateTime weekEnd = weekStart.plusDays(7);

        return eventRepository.findEventsThisWeekByOrganizationIdIn(organizationIds, weekStart, weekEnd);
    }

    public Page<Event> getEventsByCategoryForOrganizations(List<UUID> organizationIds, Event.EventCategory category, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationIdInAndCategory(organizationIds, category, pageable);
    }

    public Page<Event> getEventsByStatusForOrganizations(List<UUID> organizationIds, Event.EventStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationIdInAndStatus(organizationIds, status, pageable);
    }

    private boolean canManageEvent(User user, Event event) {
        if (event.getCreator() != null && event.getCreator().getId().equals(user.getId())) {
            return true;
        }
        if (user.getRole() == User.Role.PLATFORM_ADMIN || user.getRole() == User.Role.MODERATOR) {
            return true;
        }
        if (event.getOrganization() == null) {
            return false;
        }
        return membershipRepository.findByUserIdAndOrganizationId(user.getId(), event.getOrganization().getId())
            .map(membership -> membership.getRole() == UserOrganizationMembership.OrgRole.ORG_ADMIN
                || membership.getRole() == UserOrganizationMembership.OrgRole.MODERATOR)
            .orElse(false);
    }
    
    // Statistics
    public long countEventsByStatus(Event.EventStatus status) {
        return eventRepository.countByStatus(status);
    }
    
    public long countEventsByCategory(Event.EventCategory category) {
        return eventRepository.countByCategory(category);
    }
    
    public long countRecentEvents(int daysBack) {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(daysBack);
        return eventRepository.countByCreatedAtAfter(cutoff);
    }
    
    /**
     * Send WebSocket notification for new event created
     */
    private void notifyEventCreated(Event event, User creator) {
        try {
            if (event == null || event.getId() == null) {
                log.warn("Cannot send event created notification: event or event ID is null");
                return;
            }
            
            if (creator == null) {
                log.warn("Cannot send event created notification: creator is null for event: {}", event.getId());
                return;
            }
            
            UUID groupId = event.getGroup() != null ? event.getGroup().getId() : null;
            UUID organizationId = event.getOrganization() != null ? event.getOrganization().getId() : null;
            
            EventNotificationEvent notificationEvent = EventNotificationEvent.eventCreated(
                event.getId(),
                creator.getId(),
                creator.getName() != null ? creator.getName() : "Unknown",
                event.getTitle() != null ? event.getTitle() : "Untitled Event",
                event.getDescription(),
                event.getLocation(),
                event.getStartTime(),
                event.getEndTime(),
                organizationId,
                groupId
            );
            
            // Broadcast to all connected users - frontend will filter by organization
            messagingTemplate.convertAndSend("/topic/events", notificationEvent);
            log.info("Broadcasted event created notification for event: {}", event.getId());

            // Send Firebase push notifications
            sendEventPushNotifications(event, creator);

        } catch (Exception e) {
            log.error("Error sending event created notification: {}", e.getMessage(), e);
        }
    }

    private void sendEventPushNotifications(Event event, User creator) {
        try {
            Organization organization = event.getOrganization();
            if (organization == null) {
                return;
            }

            // Church events reach people whose church primary is this church.
            // Family events reach people whose family primary is this family.
            List<User> orgUsers = organization.getType() == Organization.OrganizationType.FAMILY
                ? userRepository.findByFamilyPrimaryOrganization(organization)
                : userRepository.findByChurchPrimaryOrganization(organization);

            // Collect FCM tokens (exclude event creator)
            List<String> tokens = orgUsers.stream()
                .filter(u -> !u.getId().equals(creator.getId()))
                .map(User::getFcmToken)
                .filter(token -> token != null && !token.trim().isEmpty())
                .collect(java.util.stream.Collectors.toList());

            if (tokens.isEmpty()) {
                log.info("No FCM tokens found for event notification in organization: {}", organization.getId());
                return;
            }

            // Prepare notification data
            java.util.Map<String, String> data = new java.util.HashMap<>();
            data.put("type", "event");
            data.put("eventId", event.getId().toString());
            data.put("organizationId", organization.getId().toString());

            // Format event time
            String eventTime = event.getStartTime() != null
                ? event.getStartTime().format(java.time.format.DateTimeFormatter.ofPattern("MMM d 'at' h:mm a"))
                : "TBD";

            // Send bulk notification
            notificationService.sendBulkNotification(
                tokens,
                "📅 New Event: " + event.getTitle(),
                eventTime + (event.getLocation() != null ? " • " + event.getLocation() : ""),
                data
            );

            log.info("Sent Firebase push notifications to {} users for event: {}", tokens.size(), event.getId());

        } catch (Exception e) {
            log.error("Failed to send Firebase push notification for event {}: {}", event.getId(), e.getMessage());
            // Don't throw - notification failure shouldn't break event creation
        }
    }
    
    /**
     * Send WebSocket notification for event update
     */
    private void notifyEventUpdated(Event event, User creator) {
        try {
            if (event == null || event.getId() == null) {
                log.warn("Cannot send event updated notification: event or event ID is null");
                return;
            }
            
            if (creator == null) {
                log.warn("Cannot send event updated notification: creator is null for event: {}", event.getId());
                return;
            }
            
            UUID groupId = event.getGroup() != null ? event.getGroup().getId() : null;
            UUID organizationId = event.getOrganization() != null ? event.getOrganization().getId() : null;
            
            EventNotificationEvent notificationEvent = EventNotificationEvent.eventUpdated(
                event.getId(),
                creator.getId(),
                creator.getName() != null ? creator.getName() : "Unknown",
                event.getTitle() != null ? event.getTitle() : "Untitled Event",
                event.getDescription(),
                event.getLocation(),
                event.getStartTime(),
                event.getEndTime(),
                organizationId,
                groupId
            );
            
            // Broadcast to all connected users - frontend will filter by organization
            messagingTemplate.convertAndSend("/topic/events", notificationEvent);
            log.info("Broadcasted event updated notification for event: {}", event.getId());
            
        } catch (Exception e) {
            log.error("Error sending event updated notification: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Send WebSocket notification for event cancelled
     */
    private void notifyEventCancelled(Event event, User creator) {
        try {
            if (event == null || event.getId() == null) {
                log.warn("Cannot send event cancelled notification: event or event ID is null");
                return;
            }
            
            if (creator == null) {
                log.warn("Cannot send event cancelled notification: creator is null for event: {}", event.getId());
                return;
            }
            
            UUID groupId = event.getGroup() != null ? event.getGroup().getId() : null;
            UUID organizationId = event.getOrganization() != null ? event.getOrganization().getId() : null;
            
            EventNotificationEvent notificationEvent = EventNotificationEvent.eventCancelled(
                event.getId(),
                creator.getId(),
                creator.getName() != null ? creator.getName() : "Unknown",
                event.getTitle() != null ? event.getTitle() : "Untitled Event",
                organizationId,
                groupId
            );
            
            // Broadcast to all connected users - frontend will filter by organization
            messagingTemplate.convertAndSend("/topic/events", notificationEvent);
            log.info("Broadcasted event cancelled notification for event: {}", event.getId());
            
        } catch (Exception e) {
            log.error("Error sending event cancelled notification: {}", e.getMessage(), e);
        }
    }
    
}