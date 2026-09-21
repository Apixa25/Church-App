package com.churchapp.service.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * What we ask the LLM to extract from a free-text organization search such as
 * "a Baptist church near Austin with a big youth group".
 *
 * The model only extracts *intent*; it never sees or returns organization IDs. The server
 * turns this into database queries (name search / nearby query), so results can only ever
 * be real, discoverable organizations.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiOrganizationSearchDraft {

    /** Proper-noun organization names or fragments the user mentioned ("Grace Community"). */
    private List<String> nameHints = new ArrayList<>();

    /** Denomination if stated, ideally matching one of the known denominations in the prompt. */
    private String denomination;

    /** CHURCH, MINISTRY, NONPROFIT - empty when the user didn't specify. */
    private List<String> orgTypes = new ArrayList<>();

    /** A place to search around ("Austin, TX", "78701", "downtown Dallas"); null when none. */
    private String placeText;

    /** True for "near me" / "nearby" / "in my area". */
    private boolean nearUser;

    /** Distance in miles when given, else null. */
    private Integer radiusMiles;

    /** True when the user is really asking about their family group (handled by invite flow). */
    private boolean wantsFamilyGroup;

    /** Criteria we can't filter by yet (size, style, programs) - surfaced to the user as a note. */
    private List<String> unsupportedCriteria = new ArrayList<>();

    private double confidence;
    private String clarificationQuestion;
}
