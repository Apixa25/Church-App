package com.churchapp.dto;

import com.churchapp.entity.EventRsvp;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventRsvpResponse {
    
    // Event details
    private UUID eventId;
    private String eventTitle;
    private LocalDateTime eventStartTime;
    private String eventLocation;
    
    // User details
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
    
    // RSVP details
    private EventRsvp.RsvpResponse response;
    private Integer guestCount;
    private String notes;
    private LocalDateTime timestamp;
    private LocalDateTime updatedAt;
    
    public static EventRsvpResponse fromEventRsvp(EventRsvp rsvp) {
        return new EventRsvpResponse(
            rsvp.getEvent().getId(),
            rsvp.getEvent().getTitle(),
            rsvp.getEvent().getStartTime(),
            rsvp.getEvent().getLocation(),
            rsvp.getUser().getId(),
            rsvp.getUser().getName(),
            rsvp.getUser().getProfilePicUrl(),
            rsvp.getResponse(),
            rsvp.getGuestCount(),
            rsvp.getNotes(),
            rsvp.getTimestamp(),
            rsvp.getUpdatedAt()
        );
    }
}