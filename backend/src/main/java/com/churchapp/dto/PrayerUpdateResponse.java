package com.churchapp.dto;

import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.PrayerUpdate;
import com.churchapp.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrayerUpdateResponse {

    private UUID id;
    private UUID prayerRequestId;
    /** Null when the prayer is anonymous — the update must not unmask its author. */
    private UUID authorId;
    private String authorName;
    private String authorProfilePicUrl;
    private String content;
    private PrayerRequest.PrayerStatus newStatus;
    private LocalDateTime createdAt;

    /**
     * Project for a viewer. Updates are written by the prayer's owner, so an
     * anonymous prayer's updates are anonymous too — unless the viewer is the
     * owner, who may see their own name.
     */
    public static PrayerUpdateResponse from(PrayerUpdate update, boolean viewerIsOwner) {
        PrayerRequest prayer = update.getPrayerRequest();
        User author = update.getAuthor();
        boolean hideAuthor = Boolean.TRUE.equals(prayer.getIsAnonymous()) && !viewerIsOwner;

        return new PrayerUpdateResponse(
            update.getId(),
            prayer.getId(),
            hideAuthor ? null : author.getId(),
            hideAuthor ? PrayerNotificationEvent.ANONYMOUS_DISPLAY_NAME : author.getName(),
            hideAuthor ? null : author.getProfilePicUrl(),
            update.getContent(),
            update.getNewStatus(),
            update.getCreatedAt()
        );
    }
}
