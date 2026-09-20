package com.churchapp.service.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * Exactly what we ask the LLM to produce. Deliberately name-based: the model
 * chooses from lists of organization/group NAMES we give it in the prompt, and
 * the server maps those names back to IDs. The model never sees or emits UUIDs,
 * which removes the hallucinated-ID and cross-tenant-leak risks entirely.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiFeedScopeDraft {

    private boolean includeChurchPrimary;
    private boolean includeFamilyPrimary;
    private boolean includeFriends;
    private boolean includeFollowing;
    private boolean includeMyGroups;
    private boolean wantsEverything;

    private List<String> organizationNames = new ArrayList<>();
    private List<String> groupNames = new ArrayList<>();

    private Nearby nearby = new Nearby();

    private double confidence;
    private String clarificationQuestion;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Nearby {
        private boolean requested;
        private Integer radiusMiles;
        private boolean sameDenominationOnly;
        private String denomination;
        private List<String> orgTypes = new ArrayList<>();
    }
}
