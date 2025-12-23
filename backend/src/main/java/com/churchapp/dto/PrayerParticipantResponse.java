package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO for returning unique participants who have interacted with a prayer request.
 * Used to display avatar stacks and supporter lists.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class PrayerParticipantResponse {
    private UUID userId;
    private String userName;
    private String userProfilePicUrl;
}
