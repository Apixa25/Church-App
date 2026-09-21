package com.churchapp.controller;

import com.churchapp.dto.NearbyOrganizationResponse;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.OrganizationDiscoveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Location-based discovery for the Find Organizations page.
 *
 *  GET /organizations/nearby?lat=&lng=&radiusMiles=25&types=CHURCH,MINISTRY&denomination=
 *  GET /organizations/nearby?q=Austin, TX&radiusMiles=25
 *  GET /organizations/denominations
 *
 * "nearby" and "denominations" are literal path segments, so they win over
 * OrganizationController's GET /{orgId} (which only accepts UUIDs anyway).
 */
@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationDiscoveryController {

    private final OrganizationDiscoveryService discoveryService;
    private final UserRepository userRepository;

    @GetMapping("/nearby")
    public ResponseEntity<NearbyOrganizationResponse> nearby(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false, name = "q") String locationText,
            @RequestParam(required = false) Double radiusMiles,
            @RequestParam(required = false) List<String> types,
            @RequestParam(required = false) String denomination,
            @AuthenticationPrincipal User userDetails) {

        UUID requesterId = userDetails == null ? null
            : userRepository.findByEmail(userDetails.getUsername()).map(com.churchapp.entity.User::getId).orElse(null);

        NearbyOrganizationResponse response = discoveryService.findNearby(
            lat, lng, locationText, radiusMiles, types, denomination, requesterId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/denominations")
    public ResponseEntity<List<String>> denominations() {
        return ResponseEntity.ok(discoveryService.listDenominations());
    }
}
