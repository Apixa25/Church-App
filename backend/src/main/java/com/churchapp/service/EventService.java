package com.churchapp.service;

import com.churchapp.dto.EventBringItemRequest;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.Event;
import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.EventRsvpRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
    private final OrganizationRepository organizationRepository;
    private final UserOrganizationMembershipRepository membershipRepository;

    public Event createEvent(UUID creatorId, Event eventRequest, Boolean bringListEnabled, List<EventBringItemRequest> bringItems, UUID organizationId) {
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + creatorId));

        // Determine organization - prioritize provided organizationId, then use primary organization
        Organization targetOrganization;
        if (organizationId != null) {
            // Use the provided organizationId from the active context
            targetOrganization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found with id: " + organizationId));
            
            // Verify user is a member of this organization
            boolean isMember = membershipRepository.existsByUserIdAndOrganizationId(creatorId, organizationId);
            if (!isMember) {
                throw new RuntimeException("You are not a member of this organization. Please join the organization before creating events.");
            }
        } else if (creator.getChurchPrimaryOrganization() != null) {
            // Fall back to church primary if no organizationId provided
            targetOrganization = creator.getChurchPrimaryOrganization();
        } else {
            throw new RuntimeException("Cannot create event without an organization. Please join a church or family first.");
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
        // Map problematic categories to working ones based on user testing
        Event.EventCategory mappedCategory = mapCategoryToWorkingValue(eventRequest.getCategory());
        event.setCategory(mappedCategory);
        
        // Store original category name for display purposes
        if (eventRequest.getCategory() != null) {
            event.setOriginalCategory(eventRequest.getCategory().name());
        }
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
        
        return savedEvent;
    }
    
    public Event getEvent(UUID eventId) {
        return eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
    }
    
    public Event updateEvent(UUID eventId, UUID userId, Event eventUpdate, Boolean bringListEnabled, List<EventBringItemRequest> bringItems) {
        Event existingEvent = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
        
        // Check if user is the creator or has admin/moderator role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (!existingEvent.getCreator().getId().equals(userId) && 
            user.getRole() != User.Role.PLATFORM_ADMIN && 
            user.getRole() != User.Role.MODERATOR) {
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
            Event.EventCategory mappedCategory = mapCategoryToWorkingValue(eventUpdate.getCategory());
            existingEvent.setCategory(mappedCategory);
            existingEvent.setOriginalCategory(eventUpdate.getCategory().name());
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
        
        boolean isCreator = event.getCreator().getId().equals(userId);
        boolean isAdmin = user.getRole() == User.Role.PLATFORM_ADMIN;
        
        log.info("Authorization result - Is Creator: {} | Is Admin: {} | Can Delete: {}", 
                isCreator, isAdmin, (isCreator || isAdmin));
        
        if (!isCreator && !isAdmin) {
            throw new RuntimeException("Not authorized to delete this event. Only the event creator or administrators can delete events.");
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
     * Get all events for user's active organization
     */
    public Page<Event> getEventsForUser(UUID userId, UUID organizationId, int page, int size) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Use provided organizationId, or fall back to primary organization
        UUID targetOrganizationId;
        if (organizationId != null) {
            // Use the provided organizationId from the active context
            targetOrganizationId = organizationId;
        } else if (user.getChurchPrimaryOrganization() != null) {
            // Fall back to church primary if no organizationId provided
            targetOrganizationId = user.getChurchPrimaryOrganization().getId();
        } else {
            throw new RuntimeException("Cannot view events without an organization");
        }

        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findByOrganizationId(targetOrganizationId, pageable);
    }

    /**
     * Get upcoming events for user's active organization
     */
    public List<Event> getUpcomingEventsForUser(UUID userId, UUID organizationId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Use provided organizationId, or fall back to primary organization
        UUID targetOrganizationId;
        if (organizationId != null) {
            // Use the provided organizationId from the active context
            targetOrganizationId = organizationId;
        } else if (user.getChurchPrimaryOrganization() != null) {
            // Fall back to church primary if no organizationId provided
            targetOrganizationId = user.getChurchPrimaryOrganization().getId();
        } else {
            throw new RuntimeException("Cannot view events without an organization");
        }

        return eventRepository.findUpcomingByOrganizationId(
            targetOrganizationId,
            LocalDateTime.now()
        );
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
    
    public Page<Event> getEventsByDateRange(LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findEventsByDateRange(startDate, endDate, pageable);
    }
    
    public Page<Event> searchEvents(String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.searchEvents(searchTerm, pageable);
    }
    
    // Dashboard/Feed methods
    public List<Event> getRecentEventsForFeed(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return eventRepository.findRecentEventsForFeed(LocalDateTime.now(), pageable);
    }
    
    public List<Event> getEventsToday() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        
        return eventRepository.findEventsToday(startOfDay, endOfDay);
    }
    
    public List<Event> getEventsThisWeek() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime weekStart = now.withHour(0).withMinute(0).withSecond(0);
        LocalDateTime weekEnd = weekStart.plusDays(7);
        
        return eventRepository.findEventsThisWeek(weekStart, weekEnd);
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
     * Maps problematic categories to working ones based on user testing.
     * Categories from "Men's Ministry" to "Other" don't work due to database constraint.
     */
    private Event.EventCategory mapCategoryToWorkingValue(Event.EventCategory category) {
        if (category == null) {
            return Event.EventCategory.GENERAL;
        }
        
        // Map problematic categories to working ones
        switch (category) {
            case MENS:
                return Event.EventCategory.MENS_MINISTRY;
            case WOMENS:
                return Event.EventCategory.WOMENS_MINISTRY;
            case SENIORS:
                return Event.EventCategory.SPECIAL_EVENT;
            case MISSIONS:
                return Event.EventCategory.MEETING;
            case MINISTRY:
                return Event.EventCategory.VOLUNTEER;
            case SOCIAL:
                return Event.EventCategory.FELLOWSHIP; // Map to working category
            case EDUCATION:
                return Event.EventCategory.BIBLE_STUDY; // Map to working category
            case MUSIC:
                return Event.EventCategory.WORSHIP; // Map to working category
            case OTHER:
                return Event.EventCategory.GENERAL; // Map to working category
            default:
                // All other categories work fine
                return category;
        }
    }
}