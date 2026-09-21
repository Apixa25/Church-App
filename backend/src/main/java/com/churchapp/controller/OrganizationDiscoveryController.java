package com.churchapp.controller;

import com.churchapp.dto.NearbyOrganizationResponse;
import com.churchapp.dto.OrganizationFinderRequest;
import com.churchapp.dto.OrganizationFinderResponse;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.OrganizationDiscoveryService;
import com.churchapp.service.OrganizationFinderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
 *  POST /organizations/finder   { text, lat?, lng? }   - natural-language search (rules first, AI when needed)
 *
 * "nearby", "denominations" and "finder" are literal path segments, so they win over
 * OrganizationController's GET /{orgId} (which only accepts UUIDs anyway).
 */
@RestController
@RequestMapping("/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationDiscoveryController {

    private final OrganizationDiscoveryService discoveryService;
    private final OrganizationFinderService finderService;
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

        UUID requesterId = resolveUserId(userDetails);

        NearbyOrganizationResponse response = discoveryService.findNearby(
            lat, lng, locationText, radiusMiles, types, denomination, requesterId);
        return ResponseEntity.ok(response);
    }

    /**
     * Natural-language finder. Authenticated only (it can spend OpenAI and geocoding budget);
     * the response always says what was actually searched so a misread is obvious.
     */
    @PostMapping("/finder")
    public ResponseEntity<OrganizationFinderResponse> finder(
            @Valid @RequestBody OrganizationFinderRequest request,
            @AuthenticationPrincipal User userDetails) {

        UUID requesterId = resolveUserId(userDetails);
        log.info("🔎 Organization finder query from {}: \"{}\"", requesterId, request.getText());

        OrganizationFinderResponse response = finderService.find(
            requesterId, request.getText(), request.getLat(), request.getLng());
        return ResponseEntity.ok(response);
    }

    private UUID resolveUserId(User userDetails) {
        return userDetails == null ? null
            : userRepository.findByEmail(userDetails.getUsername()).map(com.churchapp.entity.User::getId).orElse(null);
    }

    @GetMapping("/denominations")
    public ResponseEntity<List<String>> denominations() {
        return ResponseEntity.ok(discoveryService.listDenominations());
    }
}
