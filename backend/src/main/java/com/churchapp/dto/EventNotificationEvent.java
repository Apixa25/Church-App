package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event class for event-related WebSocket notifications
 * Used to broadcast event updates to connected clients
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventNotificationEvent {
    
    private String eventType; // "event_created", "event_updated", "event_cancelled"
    private UUID eventId;
    private UUID creatorId;
    private String creatorName;
    private String eventTitle;
    private String eventDescription;
    private String location;
    private String startTime;
    private String endTime;
    private String timestamp;
    private UUID organizationId;
    private UUID groupId;
    private String actionUrl;
    private Object metadata;
    
    // Static factory methods for different event types
    public static EventNotificationEvent eventCreated(UUID eventId, UUID creatorId, 
                                                     String creatorName, String eventTitle,
                                                     String eventDescription, String location,
                                                     LocalDateTime startTime, LocalDateTime endTime,
                                                     UUID organizationId, UUID groupId) {
        return EventNotificationEvent.builder()
                .eventType("event_created")
                .eventId(eventId)
                .creatorId(creatorId)
                .creatorName(creatorName)
                .eventTitle(eventTitle)
                .eventDescription(eventDescription)
                .location(location)
                .startTime(startTime != null ? startTime.toString() : null)
                .endTime(endTime != null ? endTime.toString() : null)
                .timestamp(LocalDateTime.now().toString())
                .organizationId(organizationId)
                .groupId(groupId)
                .actionUrl("/calendar")
                .build();
    }
    
    public static EventNotificationEvent eventUpdated(UUID eventId, UUID creatorId,
                                                     String creatorName, String eventTitle,
                                                     String eventDescription, String location,
                                                     LocalDateTime startTime, LocalDateTime endTime,
                                                     UUID organizationId, UUID groupId) {
        return EventNotificationEvent.builder()
                .eventType("event_updated")
                .eventId(eventId)
                .creatorId(creatorId)
                .creatorName(creatorName)
                .eventTitle(eventTitle)
                .eventDescription(eventDescription)
                .location(location)
                .startTime(startTime != null ? startTime.toString() : null)
                .endTime(endTime != null ? endTime.toString() : null)
                .timestamp(LocalDateTime.now().toString())
                .organizationId(organizationId)
                .groupId(groupId)
                .actionUrl("/calendar")
                .build();
    }
    
    public static EventNotificationEvent eventCancelled(UUID eventId, UUID creatorId,
                                                       String creatorName, String eventTitle,
                                                       UUID organizationId, UUID groupId) {
        return EventNotificationEvent.builder()
                .eventType("event_cancelled")
                .eventId(eventId)
                .creatorId(creatorId)
                .creatorName(creatorName)
                .eventTitle(eventTitle)
                .timestamp(LocalDateTime.now().toString())
                .organizationId(organizationId)
                .groupId(groupId)
                .actionUrl("/calendar")
                .build();
    }
}

