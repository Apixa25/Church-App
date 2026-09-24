package com.churchapp.dto;

import com.churchapp.entity.PrayerInteraction;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.PrayerUpdate;
import com.churchapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Event class for prayer-related WebSocket notifications.
 *
 * These events fan out to every subscriber of a church's prayer topic, so they
 * carry only what the UI needs to render a notification. Anonymous prayers
 * never expose the author (id, name, picture), and no event carries an email.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrayerNotificationEvent {

    public static final String ANONYMOUS_DISPLAY_NAME = "Anonymous";

    private String eventType;
    private UUID prayerRequestId;
    private UUID organizationId;
    private UUID userId;
    private String userName;
    private String title;
    private String message;
    private String timestamp;
    private String actionUrl;
    private Object metadata;

    // Static factory methods for different event types

    public static PrayerNotificationEvent newPrayerRequest(PrayerRequest prayerRequest) {
        boolean anonymous = Boolean.TRUE.equals(prayerRequest.getIsAnonymous());
        User author = prayerRequest.getUser();
        String displayName = anonymous ? ANONYMOUS_DISPLAY_NAME : author.getName();

        return PrayerNotificationEvent.builder()
                .eventType("new_prayer")
                .prayerRequestId(prayerRequest.getId())
                .organizationId(organizationIdOf(prayerRequest))
                .userId(anonymous ? null : author.getId())
                .userName(displayName)
                .title("New Prayer Request")
                .message(anonymous
                        ? "A member of your church shared a new prayer request"
                        : displayName + " has submitted a new prayer request")
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequest.getId())
                .metadata(PrayerRequestMetadata.builder()
                        .title(prayerRequest.getTitle())
                        .category(prayerRequest.getCategory() != null ? prayerRequest.getCategory().name() : null)
                        .status(prayerRequest.getStatus() != null ? prayerRequest.getStatus().name() : null)
                        .build())
                .build();
    }

    public static PrayerNotificationEvent prayerInteraction(PrayerInteraction interaction) {
        PrayerRequest prayerRequest = interaction.getPrayerRequest();
        User actor = interaction.getUser();
        PrayerInteraction.InteractionType interactionType = interaction.getType();
        boolean isComment = interactionType == PrayerInteraction.InteractionType.COMMENT;

        return PrayerNotificationEvent.builder()
                .eventType(isComment ? "prayer_comment" : "prayer_interaction")
                .prayerRequestId(prayerRequest.getId())
                .organizationId(organizationIdOf(prayerRequest))
                .userId(actor.getId())
                .userName(actor.getName())
                .title(isComment ? "New Prayer Comment" : "Prayer Support")
                .message(isComment
                        ? actor.getName() + " commented on a prayer request"
                        : actor.getName() + " is praying for a request")
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequest.getId())
                .metadata(PrayerInteractionMetadata.builder()
                        .interactionType(interactionType.toString())
                        // Comment text is fetched from the API by the detail view; the
                        // broadcast only needs to say that something happened.
                        .content(null)
                        .build())
                .build();
    }

    /** Only sent when a prayer's status actually transitions to ANSWERED. */
    public static PrayerNotificationEvent prayerAnswered(PrayerRequest prayerRequest) {
        boolean anonymous = Boolean.TRUE.equals(prayerRequest.getIsAnonymous());
        User author = prayerRequest.getUser();
        String displayName = anonymous ? ANONYMOUS_DISPLAY_NAME : author.getName();

        return PrayerNotificationEvent.builder()
                .eventType("prayer_answered")
                .prayerRequestId(prayerRequest.getId())
                .organizationId(organizationIdOf(prayerRequest))
                .userId(anonymous ? null : author.getId())
                .userName(displayName)
                .title("Prayer Answered")
                .message(anonymous
                        ? "A prayer in your church has been answered: \"" + prayerRequest.getTitle() + "\""
                        : displayName + " marked \"" + prayerRequest.getTitle() + "\" as answered")
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequest.getId())
                .metadata(PrayerRequestMetadata.builder()
                        .title(prayerRequest.getTitle())
                        .status(PrayerRequest.PrayerStatus.ANSWERED.name())
                        .category(prayerRequest.getCategory() != null ? prayerRequest.getCategory().name() : null)
                        .build())
                .build();
    }

    /** The owner posted a timeline update ("here's how it went"). */
    public static PrayerNotificationEvent prayerUpdate(PrayerUpdate update) {
        PrayerRequest prayerRequest = update.getPrayerRequest();
        boolean anonymous = Boolean.TRUE.equals(prayerRequest.getIsAnonymous());
        User author = update.getAuthor();
        String displayName = anonymous ? ANONYMOUS_DISPLAY_NAME : author.getName();

        return PrayerNotificationEvent.builder()
                .eventType("prayer_update")
                .prayerRequestId(prayerRequest.getId())
                .organizationId(organizationIdOf(prayerRequest))
                .userId(anonymous ? null : author.getId())
                .userName(displayName)
                .title("Prayer Update")
                .message(anonymous
                        ? "There's an update on a prayer in your church: \"" + prayerRequest.getTitle() + "\""
                        : displayName + " shared an update on \"" + prayerRequest.getTitle() + "\"")
                .timestamp(LocalDateTime.now().toString())
                .actionUrl("/prayers/" + prayerRequest.getId())
                .metadata(PrayerRequestMetadata.builder()
                        .title(prayerRequest.getTitle())
                        .status(prayerRequest.getStatus() != null ? prayerRequest.getStatus().name() : null)
                        .category(prayerRequest.getCategory() != null ? prayerRequest.getCategory().name() : null)
                        .build())
                .build();
    }

    private static UUID organizationIdOf(PrayerRequest prayerRequest) {
        return prayerRequest.getOrganization() != null ? prayerRequest.getOrganization().getId() : null;
    }

    // Inner classes for metadata
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrayerRequestMetadata {
        private String title;
        private String description;
        private String status;
        private String category;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrayerInteractionMetadata {
        private String interactionType;
        private String content;
    }
}
