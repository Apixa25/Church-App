package com.churchapp.service;

import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Who may see or touch a prayer request.
 *
 * Prayer requests belong to exactly one church and are visible only to that
 * church's members. This policy is shared by {@link PrayerRequestService} and
 * {@link PrayerInteractionService} so reactions, comments, participants and
 * summaries are guarded by the same rule as the prayer itself.
 */
@Component
@RequiredArgsConstructor
public class PrayerAccessPolicy {

    public static final String OUTSIDE_CHURCH_MESSAGE = "Prayer requests stay with your church.";

    private final UserRepository userRepository;

    /** True when the viewer belongs to the prayer's church (platform admins may moderate any prayer). */
    public boolean canView(PrayerRequest prayerRequest, User viewer) {
        if (viewer.getRole() == User.Role.PLATFORM_ADMIN) {
            return true;
        }
        UUID churchId = viewer.getChurchPrimaryOrganization() != null
            ? viewer.getChurchPrimaryOrganization().getId()
            : null;
        UUID prayerOrgId = prayerRequest.getOrganization() != null
            ? prayerRequest.getOrganization().getId()
            : null;
        return churchId != null && churchId.equals(prayerOrgId);
    }

    public void assertCanView(PrayerRequest prayerRequest, User viewer) {
        if (!canView(prayerRequest, viewer)) {
            throw new RuntimeException(OUTSIDE_CHURCH_MESSAGE);
        }
    }

    /** Convenience overload for callers that only hold the viewer's id. */
    public User assertCanView(PrayerRequest prayerRequest, UUID viewerId) {
        User viewer = userRepository.findById(viewerId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        assertCanView(prayerRequest, viewer);
        return viewer;
    }

    /** The viewer's church id, or null when they have not joined a church. */
    public UUID churchIdOf(User viewer) {
        return viewer.getChurchPrimaryOrganization() != null
            ? viewer.getChurchPrimaryOrganization().getId()
            : null;
    }
}
