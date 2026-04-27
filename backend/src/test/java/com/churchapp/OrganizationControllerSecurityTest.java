package com.churchapp;

import com.churchapp.controller.OrganizationController;
import com.churchapp.dto.OrganizationRequest;
import com.churchapp.dto.OrganizationResponse;
import com.churchapp.entity.Organization;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.AdminAuthorizationService;
import com.churchapp.service.AuditLogService;
import com.churchapp.service.FileUploadService;
import com.churchapp.service.MetricsSnapshotService;
import com.churchapp.service.OrganizationMetricsService;
import com.churchapp.service.OrganizationService;
import com.churchapp.service.StorageLimitService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizationControllerSecurityTest {

    @Mock
    private OrganizationService organizationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FileUploadService fileUploadService;

    @Mock
    private AdminAuthorizationService adminAuthorizationService;

    @Mock
    private OrganizationMetricsService metricsService;

    @Mock
    private MetricsSnapshotService metricsSnapshotService;

    @Mock
    private StorageLimitService storageLimitService;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private OrganizationController organizationController;

    @Test
    void updateOrganizationRejectsNonOrgAdmin() {
        UUID orgId = UUID.randomUUID();
        User securityUser = securityUser("member@example.com");
        com.churchapp.entity.User currentUser = appUser(securityUser.getUsername());

        when(userRepository.findByEmail(securityUser.getUsername())).thenReturn(Optional.of(currentUser));
        doThrow(new AccessDeniedException("No org admin access"))
            .when(adminAuthorizationService).requireOrgAdminAccess(currentUser, orgId);

        assertThrows(AccessDeniedException.class, () ->
            organizationController.updateOrganization(orgId, request(), securityUser)
        );

        verify(organizationService, never()).updateOrganization(eq(orgId), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateOrganizationDoesNotForceTrialStatus() {
        UUID orgId = UUID.randomUUID();
        User securityUser = securityUser("admin@example.com");
        com.churchapp.entity.User currentUser = appUser(securityUser.getUsername());
        Organization updatedOrganization = organization(orgId);
        ArgumentCaptor<Organization> updatesCaptor = ArgumentCaptor.forClass(Organization.class);

        when(userRepository.findByEmail(securityUser.getUsername())).thenReturn(Optional.of(currentUser));
        when(organizationService.updateOrganization(eq(orgId), updatesCaptor.capture()))
            .thenReturn(updatedOrganization);

        ResponseEntity<OrganizationResponse> response =
            organizationController.updateOrganization(orgId, request(), securityUser);

        verify(adminAuthorizationService).requireOrgAdminAccess(currentUser, orgId);
        assertEquals(orgId, response.getBody().getId());
        assertNull(updatesCaptor.getValue().getStatus());
    }

    @Test
    void getOrganizationStatsRejectsNonMembers() {
        UUID orgId = UUID.randomUUID();
        User securityUser = securityUser("member@example.com");
        com.churchapp.entity.User currentUser = appUser(securityUser.getUsername());

        when(userRepository.findByEmail(securityUser.getUsername())).thenReturn(Optional.of(currentUser));
        when(adminAuthorizationService.hasOrgAdminAccess(currentUser, orgId)).thenReturn(false);
        when(organizationService.isMember(currentUser.getId(), orgId)).thenReturn(false);

        assertThrows(ResponseStatusException.class, () ->
            organizationController.getOrganizationStats(orgId, securityUser)
        );

        verify(organizationService, never()).getMemberCount(orgId);
    }

    @Test
    void getUserMembershipsRejectsOtherUsersWithoutAdminAccess() {
        UUID requestedUserId = UUID.randomUUID();
        User securityUser = securityUser("member@example.com");
        com.churchapp.entity.User currentUser = appUser(securityUser.getUsername());

        when(userRepository.findByEmail(securityUser.getUsername())).thenReturn(Optional.of(currentUser));
        when(adminAuthorizationService.hasAnyAdminAccess(currentUser)).thenReturn(false);

        assertThrows(ResponseStatusException.class, () ->
            organizationController.getUserMemberships(requestedUserId, securityUser)
        );

        verify(organizationService, never()).getAllMemberships(requestedUserId);
    }

    private User securityUser(String email) {
        return new User(email, "password", List.of());
    }

    private com.churchapp.entity.User appUser(String email) {
        com.churchapp.entity.User user = new com.churchapp.entity.User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setName("Test User");
        user.setRole(com.churchapp.entity.User.Role.USER);
        return user;
    }

    private OrganizationRequest request() {
        OrganizationRequest request = new OrganizationRequest();
        request.setName("Updated Church");
        request.setSlug("updated-church");
        request.setType("CHURCH");
        request.setTier("BASIC");
        return request;
    }

    private Organization organization(UUID orgId) {
        Organization organization = new Organization();
        organization.setId(orgId);
        organization.setName("Updated Church");
        organization.setSlug("updated-church");
        organization.setType(Organization.OrganizationType.CHURCH);
        organization.setTier(Organization.SubscriptionTier.BASIC);
        organization.setStatus(Organization.OrganizationStatus.ACTIVE);
        return organization;
    }
}
