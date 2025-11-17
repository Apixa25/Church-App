package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.OrganizationMetrics;
import com.churchapp.entity.User;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class OrganizationMetricsService {

    private final OrganizationMetricsRepository metricsRepository;
    private final OrganizationRepository organizationRepository;
    private final PostRepository postRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final EventRepository eventRepository;
    private final AnnouncementRepository announcementRepository;
    private final ResourceRepository resourceRepository;
    private final UserOrganizationMembershipRepository membershipRepository;

    // Average file size estimates (in bytes) for storage calculation
    private static final long AVG_MEDIA_FILE_SIZE = 2_000_000L; // 2MB average for images/videos
    private static final long AVG_DOCUMENT_SIZE = 500_000L; // 500KB average for documents
    private static final long AVG_PROFILE_PIC_SIZE = 200_000L; // 200KB average for profile pics
    private static final int ACTIVE_USER_DAYS = 30; // Users active within last 30 days

    /**
     * Calculate and update metrics for an organization
     */
    public OrganizationMetrics calculateMetrics(UUID organizationId) {
        Organization org = organizationRepository.findById(organizationId)
            .orElseThrow(() -> new RuntimeException("Organization not found: " + organizationId));

        log.info("Calculating metrics for organization: {} ({})", org.getName(), organizationId);

        // Get or create metrics record
        OrganizationMetrics metrics = metricsRepository.findByOrganizationId(organizationId)
            .orElse(new OrganizationMetrics());

        metrics.setOrganization(org);
        metrics.setCalculatedAt(LocalDateTime.now());

        // Calculate activity metrics
        Long postsCount = postRepository.countByOrganizationId(organizationId);
        Long prayerRequestsCount = prayerRequestRepository.countByOrganizationId(organizationId);
        Long eventsCount = eventRepository.countByOrganizationId(organizationId);
        Long announcementsCount = announcementRepository.countByOrganizationId(organizationId);

        metrics.setPostsCount(postsCount != null ? postsCount.intValue() : 0);
        metrics.setPrayerRequestsCount(prayerRequestsCount != null ? prayerRequestsCount.intValue() : 0);
        metrics.setEventsCount(eventsCount != null ? eventsCount.intValue() : 0);
        metrics.setAnnouncementsCount(announcementsCount != null ? announcementsCount.intValue() : 0);

        // Calculate active users (users who logged in within last 30 days)
        LocalDateTime activeSince = LocalDateTime.now().minusDays(ACTIVE_USER_DAYS);
        int activeUsersCount = countActiveUsers(organizationId, activeSince);
        metrics.setActiveUsersCount(activeUsersCount);

        // Calculate storage metrics (estimated based on file counts)
        long storageMediaFiles = calculateMediaStorage(organizationId);
        long storageDocuments = calculateDocumentStorage(organizationId);
        long storageProfilePics = calculateProfilePicStorage(organizationId);
        long totalStorage = storageMediaFiles + storageDocuments + storageProfilePics;

        metrics.setStorageMediaFiles(storageMediaFiles);
        metrics.setStorageDocuments(storageDocuments);
        metrics.setStorageProfilePics(storageProfilePics);
        metrics.setStorageUsed(totalStorage);

        // Network metrics (placeholder - will be implemented with interceptor/middleware)
        // For now, set to 0 as we don't have request tracking yet
        metrics.setApiRequestsCount(0);
        metrics.setDataTransferBytes(0L);

        OrganizationMetrics saved = metricsRepository.save(metrics);
        log.info("Metrics calculated for organization {}: {} posts, {} prayers, {} events, {} active users, {} bytes storage",
            organizationId, saved.getPostsCount(), saved.getPrayerRequestsCount(),
            saved.getEventsCount(), saved.getActiveUsersCount(), saved.getStorageUsed());

        return saved;
    }

    /**
     * Get metrics for an organization, calculating if not exists
     */
    public OrganizationMetrics getMetrics(UUID organizationId) {
        return metricsRepository.findByOrganizationId(organizationId)
            .orElseGet(() -> calculateMetrics(organizationId));
    }

    /**
     * Count active users (logged in within specified time period)
     */
    private int countActiveUsers(UUID organizationId, LocalDateTime since) {
        // Get all members of the organization
        var memberships = membershipRepository.findByOrganizationId(organizationId);
        
        int activeCount = 0;
        for (var membership : memberships) {
            User user = membership.getUser();
            if (user.getLastLogin() != null && user.getLastLogin().isAfter(since)) {
                activeCount++;
            }
        }
        
        return activeCount;
    }

    /**
     * Calculate estimated storage for media files (posts, announcements)
     */
    private long calculateMediaStorage(UUID organizationId) {
        // Count posts with media
        Long postsWithMedia = postRepository.countByOrganizationId(organizationId);
        // Count announcements with images
        Long announcementsWithImages = announcementRepository.countByOrganizationId(organizationId);
        
        long totalMediaFiles = (postsWithMedia != null ? postsWithMedia : 0) +
                              (announcementsWithImages != null ? announcementsWithImages : 0);
        
        // Estimate: assume 30% of posts/announcements have media, average 2MB each
        long estimatedFiles = (long) (totalMediaFiles * 0.3);
        return estimatedFiles * AVG_MEDIA_FILE_SIZE;
    }

    /**
     * Calculate estimated storage for documents (resources library)
     */
    private long calculateDocumentStorage(UUID organizationId) {
        // Count resources uploaded by organization members
        var memberships = membershipRepository.findByOrganizationId(organizationId);
        long totalDocuments = 0;
        
        for (var membership : memberships) {
            User user = membership.getUser();
            long userResources = resourceRepository.findByUploadedBy(user, 
                org.springframework.data.domain.PageRequest.of(0, 1000)).getTotalElements();
            totalDocuments += userResources;
        }
        
        // Estimate: average 500KB per document
        return totalDocuments * AVG_DOCUMENT_SIZE;
    }

    /**
     * Calculate estimated storage for profile pictures
     */
    private long calculateProfilePicStorage(UUID organizationId) {
        // Count organization members with profile pictures
        var memberships = membershipRepository.findByOrganizationId(organizationId);
        long membersWithPics = 0;
        
        for (var membership : memberships) {
            User user = membership.getUser();
            if (user.getProfilePicUrl() != null && !user.getProfilePicUrl().isEmpty()) {
                membersWithPics++;
            }
        }
        
        // Estimate: average 200KB per profile picture
        return membersWithPics * AVG_PROFILE_PIC_SIZE;
    }

    /**
     * Update metrics for all organizations (for scheduled job)
     */
    public void updateAllOrganizationsMetrics() {
        log.info("Starting metrics update for all organizations");
        
        var organizations = organizationRepository.findAll();
        int count = 0;
        
        for (Organization org : organizations) {
            if (org.getDeletedAt() == null) {
                try {
                    calculateMetrics(org.getId());
                    count++;
                } catch (Exception e) {
                    log.error("Error calculating metrics for organization {}: {}", org.getId(), e.getMessage());
                }
            }
        }
        
        log.info("Completed metrics update for {} organizations", count);
    }

    /**
     * Increment API request count (called by interceptor/middleware)
     */
    public void incrementApiRequest(UUID organizationId, long dataTransferBytes) {
        Optional<OrganizationMetrics> metricsOpt = metricsRepository.findByOrganizationId(organizationId);
        
        if (metricsOpt.isPresent()) {
            OrganizationMetrics metrics = metricsOpt.get();
            metrics.setApiRequestsCount(metrics.getApiRequestsCount() + 1);
            metrics.setDataTransferBytes(metrics.getDataTransferBytes() + dataTransferBytes);
            metricsRepository.save(metrics);
        }
    }
}

