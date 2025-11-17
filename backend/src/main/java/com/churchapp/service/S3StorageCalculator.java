package com.churchapp.service;

import com.churchapp.entity.*;
import com.churchapp.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/**
 * Service to calculate actual storage usage from S3 for organizations.
 * Queries S3 to get real file sizes instead of using estimates.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class S3StorageCalculator {

    private final S3Client s3Client;
    private final PostRepository postRepository;
    private final ResourceRepository resourceRepository;
    private final AnnouncementRepository announcementRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final UserOrganizationMembershipRepository membershipRepository;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.region}")
    private String region;

    // Thread pool for parallel S3 queries
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);

    /**
     * Calculate actual storage for media files (posts and announcements) for an organization
     */
    public long calculateMediaStorage(UUID organizationId) {
        log.debug("Calculating media storage for organization: {}", organizationId);
        
        Set<String> mediaUrls = new HashSet<>();
        
        // Get all post media URLs for this organization
        List<Post> posts = postRepository.findAllByOrganizationId(organizationId);
        for (Post post : posts) {
            if (post.getMediaUrls() != null) {
                mediaUrls.addAll(post.getMediaUrls());
            }
        }
        
        // Get all announcement image URLs for this organization
        List<Announcement> announcements = announcementRepository.findAllByOrganizationId(organizationId);
        for (Announcement announcement : announcements) {
            if (announcement.getImageUrl() != null && !announcement.getImageUrl().isEmpty()) {
                mediaUrls.add(announcement.getImageUrl());
            }
        }
        
        // Get all prayer request image URLs for this organization
        List<PrayerRequest> prayerRequests = prayerRequestRepository.findAllByOrganizationId(organizationId);
        for (PrayerRequest prayerRequest : prayerRequests) {
            if (prayerRequest.getImageUrl() != null && !prayerRequest.getImageUrl().isEmpty()) {
                mediaUrls.add(prayerRequest.getImageUrl());
            }
        }
        
        log.debug("Found {} unique media URLs for organization {}", mediaUrls.size(), organizationId);
        
        return calculateTotalSizeFromUrls(mediaUrls);
    }

    /**
     * Calculate actual storage for documents (resources library) for an organization
     */
    public long calculateDocumentStorage(UUID organizationId) {
        log.debug("Calculating document storage for organization: {}", organizationId);
        
        // Get all resources uploaded by organization members
        var memberships = membershipRepository.findByOrganizationId(organizationId);
        Set<String> documentUrls = new HashSet<>();
        
        for (var membership : memberships) {
            User user = membership.getUser();
            List<Resource> resources = resourceRepository.findByUploadedBy(user);
            for (Resource resource : resources) {
                if (resource.getFileUrl() != null && !resource.getFileUrl().isEmpty()) {
                    // Skip YouTube URLs (not stored in S3)
                    if (!resource.getFileUrl().contains("youtube.com") && 
                        !resource.getFileUrl().contains("youtu.be")) {
                        documentUrls.add(resource.getFileUrl());
                    }
                }
            }
        }
        
        log.debug("Found {} unique document URLs for organization {}", documentUrls.size(), organizationId);
        
        return calculateTotalSizeFromUrls(documentUrls);
    }

    /**
     * Calculate actual storage for profile pictures for an organization
     */
    public long calculateProfilePicStorage(UUID organizationId) {
        log.debug("Calculating profile pic storage for organization: {}", organizationId);
        
        // Get all profile picture URLs for organization members
        var memberships = membershipRepository.findByOrganizationId(organizationId);
        Set<String> profilePicUrls = new HashSet<>();
        
        for (var membership : memberships) {
            User user = membership.getUser();
            if (user.getProfilePicUrl() != null && !user.getProfilePicUrl().isEmpty()) {
                profilePicUrls.add(user.getProfilePicUrl());
            }
        }
        
        log.debug("Found {} unique profile pic URLs for organization {}", profilePicUrls.size(), organizationId);
        
        return calculateTotalSizeFromUrls(profilePicUrls);
    }

    /**
     * Calculate total file size from a set of S3 URLs
     * Uses parallel processing for better performance
     */
    private long calculateTotalSizeFromUrls(Set<String> urls) {
        if (urls.isEmpty()) {
            return 0L;
        }

        // Extract S3 keys from URLs
        List<String> s3Keys = urls.stream()
                .map(this::extractKeyFromUrl)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (s3Keys.isEmpty()) {
            log.debug("No valid S3 keys found in URLs");
            return 0L;
        }

        log.debug("Querying S3 for {} files", s3Keys.size());

        // Query S3 in parallel
        List<CompletableFuture<Long>> futures = s3Keys.stream()
                .map(key -> CompletableFuture.supplyAsync(() -> getFileSizeFromS3(key), executorService))
                .collect(Collectors.toList());

        // Wait for all queries to complete and sum the sizes
        long totalSize = futures.stream()
                .map(CompletableFuture::join)
                .filter(size -> size > 0)
                .mapToLong(Long::longValue)
                .sum();

        log.debug("Total size calculated: {} bytes ({} KB)", totalSize, totalSize / 1024);
        
        return totalSize;
    }

    /**
     * Get file size from S3 using HeadObject
     */
    private long getFileSizeFromS3(String key) {
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            HeadObjectResponse response = s3Client.headObject(headRequest);
            long size = response.contentLength();
            
            log.trace("File {} size: {} bytes", key, size);
            return size;

        } catch (NoSuchKeyException e) {
            log.warn("File not found in S3: {}", key);
            return 0L;
        } catch (S3Exception e) {
            log.error("Error querying S3 for file {}: {}", key, e.getMessage());
            return 0L;
        } catch (Exception e) {
            log.error("Unexpected error querying S3 for file {}: {}", key, e.getMessage());
            return 0L;
        }
    }

    /**
     * Extract S3 key from URL
     * Supports formats:
     * - https://bucket.s3.region.amazonaws.com/key
     * - https://bucket.s3-region.amazonaws.com/key
     */
    private String extractKeyFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }

        try {
            // Check if it's an S3 URL
            String s3Pattern = String.format("https://%s.s3", bucketName);
            if (!url.contains(s3Pattern)) {
                // Not an S3 URL (might be YouTube, external URL, etc.)
                return null;
            }

            // Extract key after bucket name
            String urlPattern = String.format("https://%s.s3.%s.amazonaws.com/", bucketName, region);
            if (url.startsWith(urlPattern)) {
                return url.substring(urlPattern.length());
            }

            // Try alternative format (s3-region instead of s3.region)
            String altPattern = String.format("https://%s.s3-%s.amazonaws.com/", bucketName, region);
            if (url.startsWith(altPattern)) {
                return url.substring(altPattern.length());
            }

            // Try to extract from any S3 URL format
            int keyStart = url.indexOf(bucketName) + bucketName.length();
            if (keyStart < url.length()) {
                String remaining = url.substring(keyStart);
                int slashIndex = remaining.indexOf('/');
                if (slashIndex >= 0 && slashIndex < remaining.length() - 1) {
                    return remaining.substring(slashIndex + 1);
                }
            }

            log.warn("Could not extract S3 key from URL: {}", url);
            return null;

        } catch (Exception e) {
            log.warn("Error extracting S3 key from URL {}: {}", url, e.getMessage());
            return null;
        }
    }

    /**
     * Shutdown executor service (called on application shutdown)
     */
    public void shutdown() {
        executorService.shutdown();
    }
}

