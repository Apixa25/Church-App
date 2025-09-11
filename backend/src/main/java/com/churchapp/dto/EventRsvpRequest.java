package com.churchapp.dto;

import com.churchapp.entity.EventRsvp;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventRsvpRequest {
    
    @NotNull(message = "Event ID is required")
    private UUID eventId;
    
    @NotNull(message = "RSVP response is required")
    private EventRsvp.RsvpResponse response;
    
    @Min(value = 0, message = "Guest count cannot be negative")
    private Integer guestCount = 0;
    
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;
}