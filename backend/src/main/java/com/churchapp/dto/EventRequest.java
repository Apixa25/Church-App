package com.churchapp.dto;

import com.churchapp.entity.Event;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventRequest {
    
    @NotBlank(message = "Event title is required")
    @Size(min = 3, max = 200, message = "Event title must be between 3 and 200 characters")
    private String title;
    
    @Size(max = 2000, message = "Event description cannot exceed 2000 characters")
    private String description;
    
    @NotNull(message = "Event start time is required")
    private LocalDateTime startTime;
    
    private LocalDateTime endTime;
    
    @Size(max = 500, message = "Location cannot exceed 500 characters")
    private String location;
    
    private UUID groupId; // Optional - if event is associated with a chat group
    
    private Event.EventCategory category = Event.EventCategory.GENERAL;
    
    private Event.EventStatus status = Event.EventStatus.SCHEDULED;
    
    private Integer maxAttendees;
    
    private Boolean isRecurring = false;
    
    private Event.RecurrenceType recurrenceType;
    
    private LocalDateTime recurrenceEndDate;
    
    private Boolean requiresApproval = false;

    private Boolean bringListEnabled = false;

    @Valid
    private List<EventBringItemRequest> bringItems;
    
    private UUID organizationId; // Organization context for multi-tenant support
}