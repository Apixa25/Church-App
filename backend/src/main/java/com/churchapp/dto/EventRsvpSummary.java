package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventRsvpSummary {
    
    private long yesCount;
    private long noCount;
    private long maybeCount;
    private long totalResponses;
    private Integer totalAttendees; // YES responses + guest count
    
    // User's own RSVP status (if applicable)
    private String userRsvpResponse; // YES, NO, MAYBE, or null if not responded
    private Integer userGuestCount;
    private String userNotes;
}