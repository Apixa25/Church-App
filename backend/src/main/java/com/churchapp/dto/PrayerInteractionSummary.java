package com.churchapp.dto;

import com.churchapp.entity.PrayerInteraction;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PrayerInteractionSummary {
    
    private long totalInteractions;
    private long totalComments;
    private long uniqueParticipants;
    private Map<PrayerInteraction.InteractionType, Long> interactionCounts;
    
    public PrayerInteractionSummary() {
        this.interactionCounts = new HashMap<>();
        // Initialize all interaction types with 0
        for (PrayerInteraction.InteractionType type : PrayerInteraction.InteractionType.values()) {
            this.interactionCounts.put(type, 0L);
        }
    }
    
    public void setInteractionCount(PrayerInteraction.InteractionType type, Long count) {
        if (this.interactionCounts == null) {
            this.interactionCounts = new HashMap<>();
        }
        this.interactionCounts.put(type, count != null ? count : 0L);
    }
    
    public Long getInteractionCount(PrayerInteraction.InteractionType type) {
        if (this.interactionCounts == null) {
            return 0L;
        }
        return this.interactionCounts.getOrDefault(type, 0L);
    }
}