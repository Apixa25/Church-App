package com.churchapp.dto;

import com.churchapp.entity.PrayerInteraction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PrayerInteractionRequest {
    
    @NotNull(message = "Prayer request ID is required")
    private UUID prayerRequestId;
    
    @NotNull(message = "Interaction type is required")
    private PrayerInteraction.InteractionType type;
    
    @Size(max = 1000, message = "Interaction content cannot exceed 1000 characters")
    private String content; // Optional - only for comments
}