package com.churchapp.controller;

import com.churchapp.dto.EventRequest;
import com.churchapp.dto.EventResponse;
import com.churchapp.dto.EventRsvpRequest;
import com.churchapp.dto.EventRsvpResponse;
import com.churchapp.dto.EventRsvpSummary;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.Event;
import com.churchapp.entity.EventRsvp;
import com.churchapp.service.EventService;
import com.churchapp.service.UserProfileService;
import com.churchapp.service.EventRsvpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class EventController {
    
    private final EventService eventService;
    private final UserProfileService userProfileService;
    private final EventRsvpService eventRsvpService;
    
    @PostMapping
    public ResponseEntity<?> createEvent(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody EventRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Convert EventRequest to Event entity
            Event eventEntity = convertToEntity(request);
            Event createdEvent = eventService.createEvent(currentProfile.getUserId(), eventEntity);
            
            EventResponse response = EventResponse.fromEvent(createdEvent);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/{eventId}")
    public ResponseEntity<?> getEvent(@PathVariable UUID eventId,
                                    @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Event event = eventService.getEvent(eventId);
            
            EventResponse response = EventResponse.fromEvent(event);
            
            // Add RSVP summary including user's own RSVP
            EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(eventId, currentProfile.getUserId());
            response.setRsvpSummary(rsvpSummary);
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/{eventId}")
    public ResponseEntity<?> updateEvent(@PathVariable UUID eventId,
                                       @AuthenticationPrincipal User user,
                                       @Valid @RequestBody EventRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            Event eventUpdate = convertToEntity(request);
            Event updatedEvent = eventService.updateEvent(eventId, currentProfile.getUserId(), eventUpdate);
            
            EventResponse response = EventResponse.fromEvent(updatedEvent);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{eventId}")
    public ResponseEntity<?> deleteEvent(@PathVariable UUID eventId,
                                       @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            eventService.deleteEvent(eventId, currentProfile.getUserId());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Event deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getEvents(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "10") int size,
                                     @RequestParam(required = false) String category,
                                     @RequestParam(required = false) String status,
                                     @RequestParam(required = false) UUID creatorId,
                                     @RequestParam(required = false) UUID groupId,
                                     @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<Event> eventsPage;
            
            // Handle different filtering options
            if (category != null) {
                Event.EventCategory eventCategory = Event.EventCategory.valueOf(category.toUpperCase());
                eventsPage = eventService.getEventsByCategory(eventCategory, page, size);
            } else if (status != null) {
                Event.EventStatus eventStatus = Event.EventStatus.valueOf(status.toUpperCase());
                eventsPage = eventService.getEventsByStatus(eventStatus, page, size);
            } else if (creatorId != null) {
                eventsPage = eventService.getEventsByCreator(creatorId, page, size);
            } else if (groupId != null) {
                eventsPage = eventService.getEventsByGroup(groupId, page, size);
            } else {
                eventsPage = eventService.getAllEvents(page, size);
            }
            
            // Convert to response DTOs with RSVP summaries
            List<EventResponse> eventResponses = eventsPage.getContent().stream()
                .map(event -> {
                    EventResponse response = EventResponse.fromEvent(event);
                    EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(
                        event.getId(), currentProfile.getUserId());
                    response.setRsvpSummary(rsvpSummary);
                    return response;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("events", eventResponses);
            response.put("totalPages", eventsPage.getTotalPages());
            response.put("totalElements", eventsPage.getTotalElements());
            response.put("currentPage", page);
            response.put("pageSize", size);
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/upcoming")
    public ResponseEntity<?> getUpcomingEvents(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "10") int size,
                                             @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<Event> eventsPage = eventService.getUpcomingEvents(page, size);
            
            List<EventResponse> eventResponses = eventsPage.getContent().stream()
                .map(event -> {
                    EventResponse response = EventResponse.fromEvent(event);
                    EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(
                        event.getId(), currentProfile.getUserId());
                    response.setRsvpSummary(rsvpSummary);
                    return response;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("events", eventResponses);
            response.put("totalPages", eventsPage.getTotalPages());
            response.put("totalElements", eventsPage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<?> searchEvents(@RequestParam String query,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "10") int size,
                                        @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<Event> eventsPage = eventService.searchEvents(query, page, size);
            
            List<EventResponse> eventResponses = eventsPage.getContent().stream()
                .map(event -> {
                    EventResponse response = EventResponse.fromEvent(event);
                    EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(
                        event.getId(), currentProfile.getUserId());
                    response.setRsvpSummary(rsvpSummary);
                    return response;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("events", eventResponses);
            response.put("totalPages", eventsPage.getTotalPages());
            response.put("totalElements", eventsPage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/date-range")
    public ResponseEntity<?> getEventsByDateRange(
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            Page<Event> eventsPage = eventService.getEventsByDateRange(startDate, endDate, page, size);
            
            List<EventResponse> eventResponses = eventsPage.getContent().stream()
                .map(event -> {
                    EventResponse response = EventResponse.fromEvent(event);
                    EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(
                        event.getId(), currentProfile.getUserId());
                    response.setRsvpSummary(rsvpSummary);
                    return response;
                })
                .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("events", eventResponses);
            response.put("totalPages", eventsPage.getTotalPages());
            response.put("totalElements", eventsPage.getTotalElements());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/today")
    public ResponseEntity<?> getEventsToday(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<Event> events = eventService.getEventsToday();
            
            List<EventResponse> eventResponses = events.stream()
                .map(event -> {
                    EventResponse response = EventResponse.fromEvent(event);
                    EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(
                        event.getId(), currentProfile.getUserId());
                    response.setRsvpSummary(rsvpSummary);
                    return response;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(eventResponses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/this-week")
    public ResponseEntity<?> getEventsThisWeek(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<Event> events = eventService.getEventsThisWeek();
            
            List<EventResponse> eventResponses = events.stream()
                .map(event -> {
                    EventResponse response = EventResponse.fromEvent(event);
                    EventRsvpSummary rsvpSummary = eventRsvpService.getEventRsvpSummary(
                        event.getId(), currentProfile.getUserId());
                    response.setRsvpSummary(rsvpSummary);
                    return response;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(eventResponses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    // Helper method to convert EventRequest to Event entity
    private Event convertToEntity(EventRequest request) {
        Event event = new Event();
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setLocation(request.getLocation());
        event.setCategory(request.getCategory());
        event.setStatus(request.getStatus());
        event.setMaxAttendees(request.getMaxAttendees());
        event.setIsRecurring(request.getIsRecurring());
        event.setRecurrenceType(request.getRecurrenceType());
        event.setRecurrenceEndDate(request.getRecurrenceEndDate());
        event.setRequiresApproval(request.getRequiresApproval());
        
        // Handle group association
        if (request.getGroupId() != null) {
            com.churchapp.entity.ChatGroup group = new com.churchapp.entity.ChatGroup();
            group.setId(request.getGroupId());
            event.setGroup(group);
        }
        
        return event;
    }
    
    // RSVP Management Endpoints
    
    @PostMapping("/{eventId}/rsvp")
    public ResponseEntity<?> createOrUpdateRsvp(@PathVariable UUID eventId,
                                              @AuthenticationPrincipal User user,
                                              @Valid @RequestBody EventRsvpRequest request) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            // Check if user can RSVP to this event
            if (!eventRsvpService.canUserRsvp(currentProfile.getUserId(), eventId)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Cannot RSVP to this event - it may be full, past, or cancelled");
                return ResponseEntity.badRequest().body(error);
            }
            
            EventRsvp rsvp = eventRsvpService.createOrUpdateRsvp(
                currentProfile.getUserId(), 
                eventId, 
                request.getResponse(),
                request.getGuestCount(),
                request.getNotes()
            );
            
            EventRsvpResponse response = EventRsvpResponse.fromEventRsvp(rsvp);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/{eventId}/rsvp")
    public ResponseEntity<?> getUserRsvp(@PathVariable UUID eventId,
                                       @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            
            java.util.Optional<EventRsvp> rsvp = eventRsvpService.getUserRsvp(currentProfile.getUserId(), eventId);
            if (rsvp.isPresent()) {
                EventRsvpResponse response = EventRsvpResponse.fromEventRsvp(rsvp.get());
                return ResponseEntity.ok(response);
            } else {
                Map<String, String> response = new HashMap<>();
                response.put("message", "No RSVP found for this event");
                return ResponseEntity.ok(response);
            }
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{eventId}/rsvp")
    public ResponseEntity<?> deleteRsvp(@PathVariable UUID eventId,
                                      @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            eventRsvpService.deleteRsvp(currentProfile.getUserId(), eventId);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "RSVP deleted successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/{eventId}/rsvps")
    public ResponseEntity<?> getEventRsvps(@PathVariable UUID eventId,
                                         @RequestParam(required = false) String response,
                                         @AuthenticationPrincipal User user) {
        try {
            List<EventRsvp> rsvps;
            if (response != null) {
                EventRsvp.RsvpResponse rsvpResponse = EventRsvp.RsvpResponse.valueOf(response.toUpperCase());
                rsvps = eventRsvpService.getEventRsvpsByResponse(eventId, rsvpResponse);
            } else {
                rsvps = eventRsvpService.getEventRsvps(eventId);
            }
            
            List<EventRsvpResponse> rsvpResponses = rsvps.stream()
                .map(EventRsvpResponse::fromEventRsvp)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(rsvpResponses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/{eventId}/rsvp-summary")
    public ResponseEntity<?> getEventRsvpSummary(@PathVariable UUID eventId,
                                                @AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            EventRsvpSummary summary = eventRsvpService.getEventRsvpSummary(eventId, currentProfile.getUserId());
            return ResponseEntity.ok(summary);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/my-rsvps")
    public ResponseEntity<?> getUserRsvps(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<EventRsvp> rsvps = eventRsvpService.getUserRsvps(currentProfile.getUserId());
            
            List<EventRsvpResponse> rsvpResponses = rsvps.stream()
                .map(EventRsvpResponse::fromEventRsvp)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(rsvpResponses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/my-upcoming-rsvps")
    public ResponseEntity<?> getUserUpcomingRsvps(@AuthenticationPrincipal User user) {
        try {
            UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
            List<EventRsvp> rsvps = eventRsvpService.getUserUpcomingRsvps(currentProfile.getUserId());
            
            List<EventRsvpResponse> rsvpResponses = rsvps.stream()
                .map(EventRsvpResponse::fromEventRsvp)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(rsvpResponses);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}