package com.churchapp;

import com.churchapp.entity.Organization;
import com.churchapp.repository.OrganizationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Runs the real native Haversine query against the H2 (PostgreSQL mode) test database.
 *
 * Reference point: Santa Rosa, CA (38.44, -122.71).
 *  - Petaluma        ~15 mi south
 *  - San Francisco   ~50 mi south
 *  - Sacramento      ~75 mi east
 *  - Los Angeles     ~400 mi south
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrganizationRepositoryNearbyTest {

    private static final double SANTA_ROSA_LAT = 38.4404;
    private static final double SANTA_ROSA_LNG = -122.7141;

    @Autowired private OrganizationRepository organizationRepository;

    private Organization petalumaBaptist;
    private Organization sfMethodist;
    private Organization sacramentoBaptist;
    private Organization laBaptist;
    private Organization hiddenPetaluma;
    private Organization petalumaFamily;
    private Organization petalumaMinistry;
    private Organization noCoordinates;

    @BeforeEach
    void seed() {
        organizationRepository.deleteAll();

        petalumaBaptist = save("Petaluma Baptist", Organization.OrganizationType.CHURCH, "Baptist", 38.2324, -122.6367, true);
        sfMethodist = save("SF Methodist", Organization.OrganizationType.CHURCH, "Methodist", 37.7749, -122.4194, true);
        sacramentoBaptist = save("Sacramento Baptist", Organization.OrganizationType.CHURCH, "baptist", 38.5816, -121.4944, true);
        laBaptist = save("LA Baptist", Organization.OrganizationType.CHURCH, "Baptist", 34.0522, -118.2437, true);
        hiddenPetaluma = save("Hidden Chapel", Organization.OrganizationType.CHURCH, "Baptist", 38.2400, -122.6300, false);
        petalumaFamily = save("Petaluma Family", Organization.OrganizationType.FAMILY, null, 38.2350, -122.6350, true);
        petalumaMinistry = save("Petaluma Ministry", Organization.OrganizationType.MINISTRY, null, 38.2360, -122.6360, true);
        noCoordinates = save("No Location Church", Organization.OrganizationType.CHURCH, "Baptist", null, null, true);
    }

    @Test
    void findsChurchesWithinRadiusOrderedByDistance() {
        List<Organization> found = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 60, List.of("CHURCH"), null);

        List<UUID> ids = found.stream().map(Organization::getId).collect(Collectors.toList());
        assertEquals(List.of(petalumaBaptist.getId(), sfMethodist.getId()), ids, "nearest first, within 60 mi");
        assertFalse(ids.contains(sacramentoBaptist.getId()), "Sacramento is ~75 mi away");
        assertFalse(ids.contains(laBaptist.getId()));
    }

    @Test
    void radiusIsRespected() {
        List<Organization> within20 = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 20, List.of("CHURCH"), null);
        assertEquals(List.of(petalumaBaptist.getId()), within20.stream().map(Organization::getId).collect(Collectors.toList()));

        List<Organization> within100 = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 100, List.of("CHURCH"), null);
        assertTrue(within100.stream().map(Organization::getId).collect(Collectors.toList())
            .containsAll(List.of(petalumaBaptist.getId(), sfMethodist.getId(), sacramentoBaptist.getId())));
        assertFalse(within100.stream().anyMatch(o -> o.getId().equals(laBaptist.getId())));
    }

    @Test
    void denominationFilterIsCaseInsensitive() {
        List<Organization> baptist = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 100, List.of("CHURCH"), "BAPTIST");

        List<UUID> ids = baptist.stream().map(Organization::getId).collect(Collectors.toList());
        assertEquals(List.of(petalumaBaptist.getId(), sacramentoBaptist.getId()), ids);
        assertFalse(ids.contains(sfMethodist.getId()));
    }

    @Test
    void neverReturnsFamilyOrGlobalEvenIfRequested() {
        List<Organization> found = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 60, List.of("FAMILY", "GLOBAL", "CHURCH"), null);

        assertFalse(found.stream().anyMatch(o -> o.getType() == Organization.OrganizationType.FAMILY));
        assertFalse(found.stream().anyMatch(o -> o.getId().equals(petalumaFamily.getId())));
    }

    @Test
    void excludesNonDiscoverableAndOrganizationsWithoutCoordinates() {
        List<Organization> found = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 250, List.of("CHURCH"), null);

        List<UUID> ids = found.stream().map(Organization::getId).collect(Collectors.toList());
        assertFalse(ids.contains(hiddenPetaluma.getId()), "discoverable = false must be excluded");
        assertFalse(ids.contains(noCoordinates.getId()), "no lat/lng cannot be matched");
    }

    @Test
    void honoursRequestedOrganizationTypes() {
        List<Organization> ministries = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 60, List.of("MINISTRY"), null);

        assertEquals(List.of(petalumaMinistry.getId()),
            ministries.stream().map(Organization::getId).collect(Collectors.toList()));
    }

    @Test
    void excludesDeletedOrganizations() {
        petalumaBaptist.setDeletedAt(LocalDateTime.now());
        organizationRepository.save(petalumaBaptist);

        List<Organization> found = organizationRepository.findNearby(
            SANTA_ROSA_LAT, SANTA_ROSA_LNG, 20, List.of("CHURCH"), null);

        assertTrue(found.isEmpty());
    }

    private Organization save(String name, Organization.OrganizationType type, String denomination,
                              Double lat, Double lng, boolean discoverable) {
        Organization o = new Organization();
        o.setName(name);
        o.setSlug(name.toLowerCase().replace(' ', '-') + "-" + UUID.randomUUID().toString().substring(0, 6));
        o.setType(type);
        o.setStatus(Organization.OrganizationStatus.ACTIVE);
        o.setTier(Organization.SubscriptionTier.BASIC);
        o.setDenomination(denomination);
        o.setLatitude(lat != null ? BigDecimal.valueOf(lat) : null);
        o.setLongitude(lng != null ? BigDecimal.valueOf(lng) : null);
        o.setDiscoverable(discoverable);
        o.setCreatedAt(LocalDateTime.now());
        o.setUpdatedAt(LocalDateTime.now());
        return organizationRepository.save(o);
    }
}
