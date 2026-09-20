package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.Optional;
import java.util.StringJoiner;

/**
 * Converts an organization's structured address into latitude/longitude using
 * OpenStreetMap Nominatim (free, no API key). Nominatim's usage policy requires
 * a descriptive User-Agent and at most one request per second, which is fine
 * because we only geocode when an admin saves an address.
 *
 * Failures never block saving the organization; we simply record
 * geocode_status = FAILED so the admin can retry or capture GPS instead.
 */
@Service
@Slf4j
public class OrganizationGeocodingService {

    public static final String STATUS_GEOCODED = "GEOCODED";
    public static final String STATUS_GPS_CAPTURED = "GPS_CAPTURED";
    public static final String STATUS_MANUAL = "MANUAL";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_PENDING = "PENDING";

    private final RestClient restClient;
    private final boolean enabled;

    public OrganizationGeocodingService(
            @Value("${geocoding.enabled:true}") boolean enabled,
            @Value("${geocoding.nominatim.base-url:https://nominatim.openstreetmap.org}") String baseUrl,
            @Value("${geocoding.user-agent:TheGathering-ChurchApp/1.0 (contact: admin@thegathrd.com)}") String userAgent,
            @Value("${geocoding.timeout-ms:5000}") long timeoutMs) {
        this.enabled = enabled;
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader(HttpHeaders.USER_AGENT, userAgent)
            .defaultHeader(HttpHeaders.ACCEPT, "application/json")
            .requestFactory(buildRequestFactory(timeoutMs))
            .build();
    }

    public record GeoPoint(BigDecimal latitude, BigDecimal longitude) {}

    /**
     * True when the organization has enough address information to attempt geocoding.
     */
    public boolean hasGeocodableAddress(Organization org) {
        return org != null && (
            notBlank(org.getAddressLine1()) ||
            notBlank(org.getPostalCode()) ||
            (notBlank(org.getCity()) && notBlank(org.getStateProvince()))
        );
    }

    /**
     * Geocodes the organization's address and writes the result onto the entity.
     * Does not persist; the caller is responsible for saving.
     */
    public void geocodeInPlace(Organization org) {
        if (!hasGeocodableAddress(org)) {
            return;
        }
        Optional<GeoPoint> point = geocode(buildQuery(org));
        if (point.isPresent()) {
            org.setLatitude(point.get().latitude());
            org.setLongitude(point.get().longitude());
            org.setGeocodeStatus(STATUS_GEOCODED);
            log.info("📍 Geocoded organization {} -> {}, {}", org.getId(), org.getLatitude(), org.getLongitude());
        } else {
            org.setGeocodeStatus(STATUS_FAILED);
            log.warn("⚠️ Could not geocode organization {} ({})", org.getId(), buildQuery(org));
        }
    }

    public Optional<GeoPoint> geocode(String freeformAddress) {
        if (!enabled || !notBlank(freeformAddress)) {
            return Optional.empty();
        }
        try {
            String uri = UriComponentsBuilder.fromPath("/search")
                .queryParam("q", freeformAddress)
                .queryParam("format", "jsonv2")
                .queryParam("limit", 1)
                .build()
                .toUriString();

            JsonNode results = restClient.get()
                .uri(uri)
                .retrieve()
                .body(JsonNode.class);

            if (results == null || !results.isArray() || results.isEmpty()) {
                return Optional.empty();
            }
            JsonNode first = results.get(0);
            BigDecimal lat = new BigDecimal(first.get("lat").asText()).setScale(6, RoundingMode.HALF_UP);
            BigDecimal lon = new BigDecimal(first.get("lon").asText()).setScale(6, RoundingMode.HALF_UP);
            return Optional.of(new GeoPoint(lat, lon));
        } catch (Exception e) {
            log.warn("Geocoding request failed for '{}': {}", freeformAddress, e.getMessage());
            return Optional.empty();
        }
    }

    private String buildQuery(Organization org) {
        StringJoiner joiner = new StringJoiner(", ");
        if (notBlank(org.getAddressLine1())) joiner.add(org.getAddressLine1().trim());
        if (notBlank(org.getCity())) joiner.add(org.getCity().trim());
        if (notBlank(org.getStateProvince())) joiner.add(org.getStateProvince().trim());
        if (notBlank(org.getPostalCode())) joiner.add(org.getPostalCode().trim());
        joiner.add(notBlank(org.getCountry()) ? org.getCountry().trim() : "United States");
        return joiner.toString();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static org.springframework.http.client.ClientHttpRequestFactory buildRequestFactory(long timeoutMs) {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofMillis(timeoutMs).toMillis());
        factory.setReadTimeout((int) Duration.ofMillis(timeoutMs).toMillis());
        return factory;
    }
}
