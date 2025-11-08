package com.churchapp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventBringClaimRequest {

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 5000, message = "Quantity cannot exceed 5000")
    private Integer quantity;

    @Size(max = 500, message = "Note cannot exceed 500 characters")
    private String note;
}

