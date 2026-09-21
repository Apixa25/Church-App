package com.churchapp.service;

import com.churchapp.dto.NearbyOrganizationResponse;
import com.churchapp.entity.Organization;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "Churches near me" discovery for the Find Organizations page.
 *
 * Reuses the same bounding-box + Haversine query the feed's "near me" scope uses
 * (OrganizationRepository.findNearby), but centred on a point the user supplies right now -
 * either device GPS or a typed place ("Austin, TX", "78701") - rather than the coordinates saved
 * on their profile. Distances are in miles to match the rest of the app.
 *
 * Text locations are resolved through OrganizationGeocodingService (Nominatim). Nominatim's usage
 * policy is ~1 request/second for the whole app, so results are cached per normalised query and
 * each user gets a modest hourly budget of *uncached* lookups.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationDiscoveryService {

    public static final double DEFAULT_RADIUS_MILES = 25.0;
    public static final double MIN_RADIUS_MILES = 1.0;
    public static final double MAX_RADIUS_MILES = 250.0;
    public static final int MAX_RESULTS = 60;

    /** Types a person can browse for on a map. FAMILY/GLOBAL are excluded by the query as well. */
    private static final List<String> DEFAULT_TYPES = List.of("CHURCH", "MINISTRY", "NONPROFIT");
    private static final Set<String> DISCOVERABLE_TYPES = Set.of("CHURCH", "MINISTRY", "NONPROFIT", "GENERAL");

    private static final int GEOCODE_CACHE_MAX = 500;
    private static final int GEOCODE_LIMIT_PER_HOUR = 30;
    private static final Duration GEOCODE_WINDOW = Duration.ofHours(1);
    private static final double EARTH_RADIUS_MILES = 3958.8;

    private final OrganizationRepository organizationRepository;
    private final UserOrganizationMembershipRepository membershipRepository;
    private final OrganizationGeocodingService geocodingService;

    private final Map<String, Optional<OrganizationGeocodingService.GeoPoint>> geocodeCache = new ConcurrentHashMap<>();
    private final Map<UUID, Deque<Instant>> geocodeAttempts = new ConcurrentHashMap<>();

    /**
     * @param lat          search centre latitude (with lng), or null to resolve {@code locationText}
     * @param lng          search centre longitude
     * @param locationText free-text place to geocode when lat/lng are absent
     * @param radiusMiles  null for default; clamped to [1, 250]
     * @param types        optional org type names; defaults to churches/ministries/nonprofits
     * @param denomination optional exact (case-insensitive) denomination filter
     * @param requesterId  used only for the geocoding budget
     */
    @Transactional(readOnly = true)
    public NearbyOrganizationResponse findNearby(Double lat, Double lng, String locationText, Double radiusMiles,
                                                 List<String> types, String denomination, UUID requesterId) {
        double radius = clampRadius(radiusMiles);
        List<String> typeNames = resolveTypes(types);
        String denom = (denomination == null || denomination.isBlank()) ? null : denomination.trim();

        NearbyOrganizationResponse.Center center = resolveCenter(lat, lng, locationText, requesterId);

        List<Organization> found = organizationRepository.findNearby(
            center.getLatitude(), center.getLongitude(), radius, typeNames, denom);

        List<Organization> limited = found.size() > MAX_RESULTS ? found.subList(0, MAX_RESULTS) : found;
        Map<UUID, Long> memberCounts = memberCountsFor(limited);

        List<NearbyOrganizationResponse.Item> items = new ArrayList<>(limited.size());
        for (Organization org : limited) {
            double distance = haversineMiles(center.getLatitude(), center.getLongitude(),
                org.getLatitude().doubleValue(), org.getLongitude().doubleValue());
            items.add(NearbyOrganizationResponse.Item.from(org, distance, memberCounts.get(org.getId())));
        }

        log.info("Nearby discovery: {} results within {} mi of ({}, {}) types={} denomination={}",
            items.size(), radius, center.getLatitude(), center.getLongitude(), typeNames, denom);

        return new NearbyOrganizationResponse(center, radius, items);
    }

    /** Distinct denominations in use, for the filter dropdown. */
    @Transactional(readOnly = true)
    public List<String> listDenominations() {
        return organizationRepository.findDistinctDenominations();
    }

    /**
     * Resolve a typed place to coordinates using the same cache and per-user budget as
     * {@link #findNearby}. Empty when the place can't be found; throws when the budget is exhausted.
     */
    public Optional<NearbyOrganizationResponse.Center> resolvePlace(String placeText, UUID requesterId) {
        if (placeText == null || placeText.isBlank() || placeText.trim().length() > 120) {
            return Optional.empty();
        }
        String query = placeText.trim();
        return geocodeCached(query, requesterId).map(p ->
            new NearbyOrganizationResponse.Center(p.latitude().doubleValue(), p.longitude().doubleValue(), query));
    }

    /** Batch member counts for a set of organizations (one query). */
    @Transactional(readOnly = true)
    public Map<UUID, Long> memberCounts(List<Organization> orgs) {
        return memberCountsFor(orgs);
    }

    /** Great-circle distance in miles - exposed for services that centre a search elsewhere. */
    public static double distanceMiles(double lat1, double lng1, double lat2, double lng2) {
        return haversineMiles(lat1, lng1, lat2, lng2);
    }

    // ------------------------------------------------------------------------
    // Centre resolution
    // ------------------------------------------------------------------------

    private NearbyOrganizationResponse.Center resolveCenter(Double lat, Double lng, String locationText, UUID requesterId) {
        if (lat != null && lng != null) {
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                throw new IllegalArgumentException("Latitude must be between -90 and 90 and longitude between -180 and 180");
            }
            return new NearbyOrganizationResponse.Center(lat, lng, "Your location");
        }

        if (locationText == null || locationText.isBlank()) {
            throw new IllegalArgumentException("Provide either lat & lng or a location to search near");
        }

        String query = locationText.trim();
        if (query.length() > 120) {
            throw new IllegalArgumentException("Location text is too long");
        }

        Optional<OrganizationGeocodingService.GeoPoint> point = geocodeCached(query, requesterId);
        if (point.isEmpty()) {
            throw new IllegalArgumentException(
                "We couldn't find \"" + query + "\". Try a city and state, or a ZIP code.");
        }
        return new NearbyOrganizationResponse.Center(
            point.get().latitude().doubleValue(), point.get().longitude().doubleValue(), query);
    }

    private Optional<OrganizationGeocodingService.GeoPoint> geocodeCached(String query, UUID requesterId) {
        String key = query.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        Optional<OrganizationGeocodingService.GeoPoint> cached = geocodeCache.get(key);
        if (cached != null) {
            return cached;
        }

        if (requesterId != null && !tryAcquireGeocode(requesterId)) {
            throw new IllegalArgumentException(
                "You've looked up a lot of places in the last hour. Use your current location or try again later.");
        }

        Optional<OrganizationGeocodingService.GeoPoint> result = geocodingService.geocode(query);
        if (geocodeCache.size() >= GEOCODE_CACHE_MAX) {
            geocodeCache.clear();
        }
        // Cache misses too, so repeated typos don't keep hitting Nominatim
        geocodeCache.put(key, result);
        return result;
    }

    private boolean tryAcquireGeocode(UUID userId) {
        Deque<Instant> window = geocodeAttempts.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (window) {
            Instant now = Instant.now();
            Instant cutoff = now.minus(GEOCODE_WINDOW);
            while (!window.isEmpty() && window.peekFirst().isBefore(cutoff)) {
                window.pollFirst();
            }
            if (window.size() >= GEOCODE_LIMIT_PER_HOUR) {
                return false;
            }
            window.addLast(now);
            return true;
        }
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private static double clampRadius(Double radiusMiles) {
        if (radiusMiles == null || radiusMiles.isNaN()) {
            return DEFAULT_RADIUS_MILES;
        }
        return Math.max(MIN_RADIUS_MILES, Math.min(MAX_RADIUS_MILES, radiusMiles));
    }

    private static List<String> resolveTypes(List<String> types) {
        if (types == null || types.isEmpty()) {
            return DEFAULT_TYPES;
        }
        List<String> resolved = new ArrayList<>();
        for (String t : types) {
            if (t == null) continue;
            String name = t.trim().toUpperCase(Locale.ROOT);
            if (DISCOVERABLE_TYPES.contains(name) && !resolved.contains(name)) {
                resolved.add(name);
            }
        }
        return resolved.isEmpty() ? DEFAULT_TYPES : resolved;
    }

    private Map<UUID, Long> memberCountsFor(List<Organization> orgs) {
        Map<UUID, Long> counts = new HashMap<>();
        if (orgs.isEmpty()) {
            return counts;
        }
        List<UUID> ids = orgs.stream().map(Organization::getId).toList();
        for (Object[] row : membershipRepository.countByOrganizationIds(ids)) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    /** Great-circle distance in miles. Same formula as the SQL in findNearby, kept here for the response. */
    static double haversineMiles(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
