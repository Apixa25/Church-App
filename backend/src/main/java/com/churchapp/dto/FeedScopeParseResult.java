package com.churchapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * What the parser hands back for the preview card. Nothing is saved until the
 * user confirms and the frontend calls PUT /feed-preferences/scope.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedScopeParseResult {

    /** Sanitized scope ready to save. Null when the request maps to a legacy filter. */
    private FeedScope scope;

    /**
     * When the sentence means "show me everything" / "all my stuff" we point the
     * frontend at the existing filter instead of building a CUSTOM scope.
     * One of EVERYTHING, ALL, or null.
     */
    private String legacyFilter;

    /** Human readable summary, e.g. "First Baptist + Smith Family + 4 Baptist churches within 100 mi". */
    private String description;

    /** 0.0 - 1.0. Below ~0.5 the UI should show the clarification question prominently. */
    private double confidence;

    /** Follow-up question when the parser could not fully resolve the request. */
    private String clarificationQuestion;

    /** Validator notes about things that were removed or need attention. */
    @Builder.Default
    private List<String> warnings = new ArrayList<>();

    /** RULES or AI - useful for debugging and analytics. */
    private String source;

    /** Echo of what the user typed. */
    private String sourceText;
}
