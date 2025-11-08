package com.churchapp.dto;

import com.churchapp.entity.Event;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
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
    private Boolean bringListEnabled;
    private List<EventBringItemResponse> bringItems;
    
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
            getDisplayCategory(event),
            event.getStatus(),
            event.getMaxAttendees(),
            event.getIsRecurring(),
            event.getRecurrenceType(),
            event.getRecurrenceEndDate(),
            event.getRequiresApproval(),
            event.getBringListEnabled(),
            null,
            null, // rsvpSummary will be set separately if needed
            event.getCreatedAt(),
            event.getUpdatedAt()
        );
    }
    
    /**
     * Gets the display category for the event.
     * Uses original category name if available, otherwise maps database category to frontend category.
     */
    private static Event.EventCategory getDisplayCategory(Event event) {
        // If we have the original category name, use it
        if (event.getOriginalCategory() != null && !event.getOriginalCategory().isEmpty()) {
            try {
                return Event.EventCategory.valueOf(event.getOriginalCategory());
            } catch (IllegalArgumentException e) {
                // If original category is invalid, fall back to mapping
            }
        }
        
        // Fall back to mapping database category to frontend category
        return mapDatabaseCategoryToFrontendCategory(event.getCategory());
    }
    
    /**
     * Maps database category values back to frontend category values for display.
     * This ensures users see the category names they originally selected.
     */
    private static Event.EventCategory mapDatabaseCategoryToFrontendCategory(Event.EventCategory databaseCategory) {
        if (databaseCategory == null) {
            return Event.EventCategory.GENERAL;
        }
        
        // Map database values back to frontend values
        switch (databaseCategory) {
            case MENS_MINISTRY:
                return Event.EventCategory.MENS;
            case WOMENS_MINISTRY:
                return Event.EventCategory.WOMENS;
            case SPECIAL_EVENT:
                return Event.EventCategory.SENIORS;
            case MEETING:
                return Event.EventCategory.MISSIONS;
            case VOLUNTEER:
                return Event.EventCategory.MINISTRY;
            default:
                // All other categories are the same in both frontend and database
                return databaseCategory;
        }
    }
}