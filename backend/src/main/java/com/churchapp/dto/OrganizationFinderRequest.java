package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Body for POST /organizations/finder. */
@Data
public class OrganizationFinderRequest {

    @NotBlank(message = "Tell us what you're looking for")
    @Size(max = 300, message = "Keep it under 300 characters")
    private String text;

    /** Optional device coordinates so "near me" can be resolved without a saved profile location. */
    private Double lat;
    private Double lng;
}
