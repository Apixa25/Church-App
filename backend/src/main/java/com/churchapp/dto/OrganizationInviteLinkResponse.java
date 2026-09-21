package com.churchapp.dto;

import com.churchapp.entity.Organization;
import com.churchapp.entity.OrganizationInviteLink;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Public-safe view of an organization invite link. This DTO is returned by the
 * unauthenticated preview endpoint, so it deliberately exposes only what an invitee
 * needs to recognise the family: name, logo, type, member count and who invited them.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationInviteLinkResponse {

    private UUID id;

    private UUID organizationId;
    private String organizationName;
    private String organizationLogoUrl;
    private String organizationType;
    private Long memberCount;

    private String inviteCode;
    private String inviteUrl;
    private Integer useCount;
    private Boolean isActive;

    private UUID createdById;
    private String createdByName;

    private LocalDateTime createdAt;

    /** Web path the frontend serves for family invites (see App.tsx routes). */
    public static final String FAMILY_INVITE_PATH = "/invite/family/";

    public static OrganizationInviteLinkResponse fromEntity(OrganizationInviteLink link, String baseUrl, Long memberCount) {
        OrganizationInviteLinkResponse response = new OrganizationInviteLinkResponse();
        response.setId(link.getId());
        response.setInviteCode(link.getInviteCode());
        response.setInviteUrl(trimTrailingSlash(baseUrl) + FAMILY_INVITE_PATH + link.getInviteCode());
        response.setUseCount(link.getUseCount());
        response.setIsActive(link.getIsActive());
        response.setCreatedAt(link.getCreatedAt());
        response.setMemberCount(memberCount);

        Organization org = link.getOrganization();
        if (org != null) {
            response.setOrganizationId(org.getId());
            response.setOrganizationName(org.getName());
            response.setOrganizationLogoUrl(org.getLogoUrl());
            response.setOrganizationType(org.getType() != null ? org.getType().name() : null);
        }

        if (link.getCreatedBy() != null) {
            response.setCreatedById(link.getCreatedBy().getId());
            response.setCreatedByName(link.getCreatedBy().getName());
        }

        return response;
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) return "";
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
