package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Church-life actions (prayer, announcements, giving, home stats) belong to
 * the user's locked church primary. A family, a social group, or another
 * church is not a substitute for those.
 *
 * The calendar is the person's own view: their church primary and their
 * family primary together. Each entry still belongs to exactly one of those
 * two homes.
 */
@Service
@RequiredArgsConstructor
public class ChurchPrimaryResolver {

    private final OrganizationRepository organizationRepository;

    public Organization requireChurch(User user) {
        Organization church = user.getChurchPrimaryOrganization();
        if (church == null) {
            throw new RuntimeException(
                "Join a church before using this. Your family stays on the feed and in messages.");
        }
        return church;
    }

    /**
     * Uses the caller's church. A requested id is accepted only when it is that church.
     */
    public Organization requireChurchMatch(User user, UUID requestedOrganizationId) {
        Organization church = requireChurch(user);
        if (requestedOrganizationId != null && !church.getId().equals(requestedOrganizationId)) {
            throw new RuntimeException("This stays with your church, " + church.getName() + ".");
        }
        return church;
    }

    /**
     * The organizations that appear on this person's calendar: church primary
     * first, then family primary. Social groups are never included.
     */
    public List<Organization> personalCalendarHomes(User user) {
        List<Organization> homes = new ArrayList<>();
        if (user.getChurchPrimaryOrganization() != null) {
            homes.add(user.getChurchPrimaryOrganization());
        }
        if (user.getFamilyPrimaryOrganization() != null) {
            homes.add(user.getFamilyPrimaryOrganization());
        }
        return homes;
    }

    /**
     * Where a new calendar entry is saved. Null uses the church when the
     * person has one, otherwise the family. A named id is accepted only when
     * it is one of those two homes. Platform admins may still name another
     * organization explicitly.
     */
    public Organization resolveCalendarEntryHome(User user, UUID requestedOrganizationId) {
        if (isAdminInspection(user, requestedOrganizationId)) {
            return organizationRepository.findById(requestedOrganizationId)
                .orElseThrow(() -> new RuntimeException(
                    "Organization not found with id: " + requestedOrganizationId));
        }
        List<Organization> homes = requireCalendarHomes(user);
        if (requestedOrganizationId == null) {
            return homes.get(0);
        }
        return homes.stream()
            .filter(home -> home.getId().equals(requestedOrganizationId))
            .findFirst()
            .orElseThrow(() -> new RuntimeException(
                "Calendar entries stay with your church or your family."));
    }

    /**
     * Organizations whose events belong on this person's calendar. Passing
     * their own church or family id still returns both homes, because the
     * calendar is one combined view. A different id is rejected, except when
     * a platform admin is opening an organization they named.
     */
    public List<UUID> personalCalendarOrganizationIds(User user, UUID requestedOrganizationId) {
        if (isAdminInspection(user, requestedOrganizationId)) {
            if (!organizationRepository.existsById(requestedOrganizationId)) {
                throw new RuntimeException("Organization not found with id: " + requestedOrganizationId);
            }
            return List.of(requestedOrganizationId);
        }
        if (requestedOrganizationId != null && !ownsCalendarHome(user, requestedOrganizationId)) {
            throw new RuntimeException("Calendar entries stay with your church or your family.");
        }
        return requireCalendarHomes(user).stream()
            .map(Organization::getId)
            .distinct()
            .toList();
    }

    public void assertCanViewCalendarEvent(User user, Organization eventOrganization) {
        if (eventOrganization == null) {
            throw new RuntimeException("Event is not available");
        }
        if (user.getRole() == User.Role.PLATFORM_ADMIN) {
            return;
        }
        if (!ownsCalendarHome(user, eventOrganization.getId())) {
            throw new RuntimeException("Calendar entries stay with your church or your family.");
        }
    }

    private List<Organization> requireCalendarHomes(User user) {
        List<Organization> homes = personalCalendarHomes(user);
        if (homes.isEmpty()) {
            throw new RuntimeException("Join a church or a family before using the calendar.");
        }
        return homes;
    }

    private boolean ownsCalendarHome(User user, UUID organizationId) {
        return personalCalendarHomes(user).stream()
            .anyMatch(home -> home.getId().equals(organizationId));
    }

    private boolean isAdminInspection(User user, UUID requestedOrganizationId) {
        return user.getRole() == User.Role.PLATFORM_ADMIN
            && requestedOrganizationId != null
            && !ownsCalendarHome(user, requestedOrganizationId);
    }
}
