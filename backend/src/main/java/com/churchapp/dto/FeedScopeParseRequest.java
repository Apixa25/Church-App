package com.churchapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedScopeParseRequest {

    @NotBlank(message = "Tell us what you'd like to see")
    @Size(max = 500, message = "Keep it under 500 characters")
    private String text;
}
