package com.churchapp.service;

import com.churchapp.dto.EventRsvpSummary;
import com.churchapp.entity.Event;
import com.churchapp.entity.EventRsvp;
import com.churchapp.entity.User;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.EventRsvpRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class EventRsvpService {
    
    private final EventRsvpRepository eventRsvpRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    
    public EventRsvp createOrUpdateRsvp(UUID userId, UUID eventId, EventRsvp.RsvpResponse response, 
                                       Integer guestCount, String notes) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found with id: " + eventId));
        
        // Check if RSVP already exists
        Optional<EventRsvp> existingRsvp = eventRsvpRepository.findByUserIdAndEventId(userId, eventId);
        
        EventRsvp rsvp;
        if (existingRsvp.isPresent()) {
            // Update existing RSVP
            rsvp = existingRsvp.get();
            rsvp.setResponse(response);
            rsvp.setGuestCount(guestCount != null ? guestCount : 0);
            rsvp.setNotes(notes != null ? notes.trim() : null);
            log.info("Updated RSVP for user: {} and event: {}", userId, eventId);
        } else {
            // Create new RSVP
            rsvp = new EventRsvp();
            rsvp.setUser(user);
            rsvp.setEvent(event);
            rsvp.setResponse(response);
            rsvp.setGuestCount(guestCount != null ? guestCount : 0);
            rsvp.setNotes(notes != null ? notes.trim() : null);
            log.info("Created new RSVP for user: {} and event: {}", userId, eventId);
        }
        
        return eventRsvpRepository.save(rsvp);
    }
    
    public void deleteRsvp(UUID userId, UUID eventId) {
        Optional<EventRsvp> existingRsvp = eventRsvpRepository.findByUserIdAndEventId(userId, eventId);
        if (existingRsvp.isPresent()) {
            eventRsvpRepository.delete(existingRsvp.get());
            log.info("Deleted RSVP for user: {} and event: {}", userId, eventId);
        } else {
            throw new RuntimeException("RSVP not found for user: " + userId + " and event: " + eventId);
        }
    }
    
    public Optional<EventRsvp> getUserRsvp(UUID userId, UUID eventId) {
        return eventRsvpRepository.findByUserIdAndEventId(userId, eventId);
    }
    
    public List<EventRsvp> getEventRsvps(UUID eventId) {
        return eventRsvpRepository.findByEventIdOrderByTimestampDesc(eventId);
    }
    
    public List<EventRsvp> getEventRsvpsByResponse(UUID eventId, EventRsvp.RsvpResponse response) {
        return eventRsvpRepository.findByEventIdAndResponseOrderByTimestampDesc(eventId, response);
    }
    
    public List<EventRsvp> getUserRsvps(UUID userId) {
        return eventRsvpRepository.findByUserIdOrderByTimestampDesc(userId);
    }
    
    public List<EventRsvp> getUserUpcomingRsvps(UUID userId) {
        return eventRsvpRepository.findUserUpcomingYesRsvps(userId, LocalDateTime.now());
    }
    
    public EventRsvpSummary getEventRsvpSummary(UUID eventId, UUID currentUserId) {
        // Get RSVP counts
        long yesCount = eventRsvpRepository.countByEventIdAndResponse(eventId, EventRsvp.RsvpResponse.YES);
        long noCount = eventRsvpRepository.countByEventIdAndResponse(eventId, EventRsvp.RsvpResponse.NO);
        long maybeCount = eventRsvpRepository.countByEventIdAndResponse(eventId, EventRsvp.RsvpResponse.MAYBE);
        long totalResponses = yesCount + noCount + maybeCount;
        
        // Get total attendees (YES responses + guest count)
        Integer totalAttendees = eventRsvpRepository.getTotalAttendeeCountForEvent(eventId);
        if (totalAttendees == null) {
            totalAttendees = 0;
        }
        
        EventRsvpSummary summary = new EventRsvpSummary();
        summary.setYesCount(yesCount);
        summary.setNoCount(noCount);
        summary.setMaybeCount(maybeCount);
        summary.setTotalResponses(totalResponses);
        summary.setTotalAttendees(totalAttendees);
        
        // Get user's own RSVP if it exists
        Optional<EventRsvp> userRsvp = eventRsvpRepository.findByUserIdAndEventId(currentUserId, eventId);
        if (userRsvp.isPresent()) {
            EventRsvp rsvp = userRsvp.get();
            summary.setUserRsvpResponse(rsvp.getResponse().toString());
            summary.setUserGuestCount(rsvp.getGuestCount());
            summary.setUserNotes(rsvp.getNotes());
        }
        
        return summary;
    }
    
    // Statistics and reporting methods
    public long countEventRsvps(UUID eventId) {
        return eventRsvpRepository.countByEventId(eventId);
    }
    
    public long countEventRsvpsByResponse(UUID eventId, EventRsvp.RsvpResponse response) {
        return eventRsvpRepository.countByEventIdAndResponse(eventId, response);
    }
    
    public Integer getEventTotalAttendees(UUID eventId) {
        Integer totalAttendees = eventRsvpRepository.getTotalAttendeeCountForEvent(eventId);
        return totalAttendees != null ? totalAttendees : 0;
    }
    
    public Integer getEventTotalGuests(UUID eventId) {
        Integer totalGuests = eventRsvpRepository.getTotalGuestCountForEvent(eventId);
        return totalGuests != null ? totalGuests : 0;
    }
    
    // Dashboard/Feed methods
    public List<EventRsvp> getRecentRsvpsForFeed(int limit) {
        return eventRsvpRepository.findByTimestampAfterOrderByTimestampDesc(
            LocalDateTime.now().minusDays(7), 
            org.springframework.data.domain.PageRequest.of(0, limit)
        );
    }
    
    // Cleanup methods
    public void deleteAllEventRsvps(UUID eventId) {
        eventRsvpRepository.deleteByEventId(eventId);
        log.info("Deleted all RSVPs for event: {}", eventId);
    }
    
    // Validation methods
    public boolean canUserRsvp(UUID userId, UUID eventId) {
        try {
            Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));
            
            // Check if event is in the future
            if (event.getStartTime().isBefore(LocalDateTime.now())) {
                return false;
            }
            
            // Check if event is still scheduled
            if (event.getStatus() != Event.EventStatus.SCHEDULED) {
                return false;
            }
            
            // Check if event has max attendees limit
            if (event.getMaxAttendees() != null) {
                Integer currentAttendees = getEventTotalAttendees(eventId);
                if (currentAttendees >= event.getMaxAttendees()) {
                    // Allow user to change their existing RSVP but not add new ones
                    return eventRsvpRepository.findByUserIdAndEventId(userId, eventId).isPresent();
                }
            }
            
            return true;
        } catch (Exception e) {
            log.error("Error checking if user can RSVP: {}", e.getMessage());
            return false;
        }
    }
}