package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Church-life actions (prayer, calendar, announcements, giving, home stats)
 * belong to the user's locked church primary. A family, a social group, or
 * another church is not a substitute.
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
     * Calendar access. Platform admins may open a church they name explicitly.
     * Every other caller is limited to their church primary.
     */
    public Organization resolveCalendarChurch(User user, UUID requestedOrganizationId) {
        if (user.getRole() == User.Role.PLATFORM_ADMIN && requestedOrganizationId != null) {
            return organizationRepository.findById(requestedOrganizationId)
                .orElseThrow(() -> new RuntimeException(
                    "Organization not found with id: " + requestedOrganizationId));
        }
        return requireChurchMatch(user, requestedOrganizationId);
    }
}
