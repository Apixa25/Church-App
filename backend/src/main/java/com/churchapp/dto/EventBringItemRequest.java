package com.churchapp.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventBringItemRequest {

    private UUID id;

    @NotBlank(message = "Item name is required")
    @Size(max = 200, message = "Item name cannot exceed 200 characters")
    private String name;

    @Size(max = 500, message = "Description cannot exceed 500 characters")
    private String description;

    @Min(value = 1, message = "Quantity needed must be at least 1")
    @Max(value = 5000, message = "Quantity needed cannot exceed 5000")
    private Integer quantityNeeded;

    @Builder.Default
    private Boolean allowMultipleClaims = true;
}

