package com.churchapp.dto;

import com.churchapp.entity.PrayerRequest;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrayerUpdateRequest {

    @NotBlank(message = "Update text is required")
    @Size(max = 2000, message = "Update cannot exceed 2000 characters")
    private String content;

    /** Optional: also move the prayer to this status (e.g. ANSWERED) with the update. */
    private PrayerRequest.PrayerStatus newStatus;
}
