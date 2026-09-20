package com.churchapp.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedScopeSaveRequest {

    @NotNull(message = "Scope is required")
    private FeedScope scope;

    /** What the user typed (or null when the scope came from a quick chip). */
    @Size(max = 500)
    private String sourceText;
}
