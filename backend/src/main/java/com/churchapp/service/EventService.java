package com.churchapp.service;

import com.churchapp.entity.Event;
import com.churchapp.entity.User;
import com.churchapp.entity.ChatGroup;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.ChatGroupRepository;
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
    private final UserRepository userRepository;
    private final ChatGroupRepository chatGroupRepository;
    
    public Event createEvent(UUID creatorId, Event eventRequest) {
        User creator = userRepository.findById(creatorId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + creatorId));
        
        Event event = new Event();
        event.setTitle(eventRequest.getTitle().trim());
        event.setDescription(eventRequest.getDescription() != null ? eventRequest.getDescription().trim() : null);
        event.setStartTime(eventRequest.getStartTime());
        event.setEndTime(eventRequest.getEndTime());
        event.setLocation(eventRequest.getLocation() != null ? eventRequest.getLocation().trim() : null);
        event.setCreator(creator);
        event.setCategory(eventRequest.getCategory() != null ? eventRequest.getCategory() : Event.EventCategory.GENERAL);
        event.setMaxAttendees(eventRequest.getMaxAttendees());
        event.setIsRecurring(eventRequest.getIsRecurring() != null ? eventRequest.getIsRecurring() : false);
        event.setRecurrenceType(eventRequest.getRecurrenceType());
        event.setRecurrenceEndDate(eventRequest.getRecurrenceEndDate());
        event.setRequiresApproval(eventRequest.getRequiresApproval() != null ? eventRequest.getRequiresApproval() : false);
        event.setStatus(Event.EventStatus.SCHEDULED);
        
        // Set group if provided
        if (eventRequest.getGroup() != null && eventRequest.getGroup().getId() != null) {
            ChatGroup group = chatGroupRepository.findById(eventRequest.getGroup().getId())
                .orElseThrow(() -> new RuntimeException("Chat group not found with id: " + eventRequest.getGroup().getId()));
            event.setGroup(group);
        }
        
        Event savedEvent = eventRepository.save(event);
        log.info("Event created with id: {} by user: {}", savedEvent.getId(), creatorId);
        
        return savedEvent;
    }
    
    public Event getEvent(UUID eventId) {
        return eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
    }
    
    public Event updateEvent(UUID eventId, UUID userId, Event eventUpdate) {
        Event existingEvent = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
        
        // Check if user is the creator or has admin/moderator role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (!existingEvent.getCreator().getId().equals(userId) && 
            user.getRole() != User.UserRole.ADMIN && 
            user.getRole() != User.UserRole.MODERATOR) {
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
        }
        if (eventUpdate.getStatus() != null) {
            existingEvent.setStatus(eventUpdate.getStatus());
        }
        if (eventUpdate.getMaxAttendees() != null) {
            existingEvent.setMaxAttendees(eventUpdate.getMaxAttendees());
        }
        
        Event updatedEvent = eventRepository.save(existingEvent);
        log.info("Event updated with id: {} by user: {}", eventId, userId);
        
        return updatedEvent;
    }
    
    public void deleteEvent(UUID eventId, UUID userId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
        
        // Check if user is the creator or has admin role
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (!event.getCreator().getId().equals(userId) && user.getRole() != User.UserRole.ADMIN) {
            throw new RuntimeException("Not authorized to delete this event");
        }
        
        eventRepository.delete(event);
        log.info("Event deleted with id: {} by user: {}", eventId, userId);
    }
    
    // Query methods
    public Page<Event> getAllEvents(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return eventRepository.findAll(pageable);
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
        return eventRepository.findEventsToday();
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
}