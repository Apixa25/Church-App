package com.churchapp.service;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Single source of truth for prayer WebSocket destinations.
 *
 * Prayer events are church-scoped: a member only ever receives events for the
 * church they belong to. {@link com.churchapp.config.WebSocketConfig} uses the
 * patterns here to authorize SUBSCRIBE frames, and the services use the
 * builders to publish, so the two can't drift apart.
 */
public final class PrayerTopics {

    private static final String UUID_GROUP = "([0-9a-fA-F-]{36})";

    /** New prayers and answered-prayer celebrations for one church. */
    public static final Pattern ORGANIZATION_PRAYERS_PATTERN =
        Pattern.compile("^/topic/organizations/" + UUID_GROUP + "/prayers$");

    /** Reactions and comments on one prayer. */
    public static final Pattern PRAYER_INTERACTIONS_PATTERN =
        Pattern.compile("^/topic/prayers/" + UUID_GROUP + "/interactions$");

    private PrayerTopics() {
    }

    public static String organizationPrayers(UUID organizationId) {
        return "/topic/organizations/" + organizationId + "/prayers";
    }

    public static String prayerInteractions(UUID prayerRequestId) {
        return "/topic/prayers/" + prayerRequestId + "/interactions";
    }
}
