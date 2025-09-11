package com.churchapp.dto;

import com.churchapp.entity.Event;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventResponse {
    
    private UUID id;
    private String title;
    private String description;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String location;
    
    // Creator details
    private UUID creatorId;
    private String creatorName;
    private String creatorProfilePicUrl;
    
    // Group details (if associated)
    private UUID groupId;
    private String groupName;
    
    private Event.EventCategory category;
    private Event.EventStatus status;
    private Integer maxAttendees;
    private Boolean isRecurring;
    private Event.RecurrenceType recurrenceType;
    private LocalDateTime recurrenceEndDate;
    private Boolean requiresApproval;
    
    // RSVP summary
    private EventRsvpSummary rsvpSummary;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static EventResponse fromEvent(Event event) {
        return new EventResponse(
            event.getId(),
            event.getTitle(),
            event.getDescription(),
            event.getStartTime(),
            event.getEndTime(),
            event.getLocation(),
            event.getCreator().getId(),
            event.getCreator().getName(),
            event.getCreator().getProfilePicUrl(),
            event.getGroup() != null ? event.getGroup().getId() : null,
            event.getGroup() != null ? event.getGroup().getName() : null,
            event.getCategory(),
            event.getStatus(),
            event.getMaxAttendees(),
            event.getIsRecurring(),
            event.getRecurrenceType(),
            event.getRecurrenceEndDate(),
            event.getRequiresApproval(),
            null, // rsvpSummary will be set separately if needed
            event.getCreatedAt(),
            event.getUpdatedAt()
        );
    }
}