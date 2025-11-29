package com.churchapp.service;

import com.churchapp.dto.ModerationResponse;
import com.churchapp.entity.ContentReport;
import com.churchapp.entity.Post;
import com.churchapp.entity.User;
import com.churchapp.repository.ContentReportRepository;
import com.churchapp.repository.PostBookmarkRepository;
import com.churchapp.repository.PostCommentRepository;
import com.churchapp.repository.PostLikeRepository;
import com.churchapp.repository.PostRepository;
import com.churchapp.repository.PostShareRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContentModerationService {

    private final AuditLogService auditLogService;
    private final ContentReportRepository contentReportRepository;
    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostBookmarkRepository postBookmarkRepository;
    private final PostShareRepository postShareRepository;
    private final UserRepository userRepository;
    private final com.churchapp.service.UserManagementService userManagementService;

    @Transactional(readOnly = true)
    public Page<ModerationResponse> getReportedContent(Pageable pageable, String contentType, String status, String priority) {
        try {
            log.debug("Fetching reported content with filters: contentType={}, status={}, priority={}", contentType, status, priority);
            
            // Fetch reports - relationships will be lazy loaded within transaction
            Page<ContentReport> reports = contentReportRepository.findWithFilters(
                contentType, status, priority, pageable);

            log.debug("Found {} reports (total: {})", reports.getContent().size(), reports.getTotalElements());

            // Convert to response DTOs - relationships will be accessed within transaction
            List<ModerationResponse> responseList = new ArrayList<>();
            for (ContentReport report : reports.getContent()) {
                try {
                    ModerationResponse response = mapToModerationResponse(report);
                    responseList.add(response);
                    log.debug("Mapped report {} - contentPreview: {}, contentAuthor: {}", 
                        report.getId(), 
                        response.getContentPreview() != null ? "present" : "null",
                        response.getContentAuthor() != null ? response.getContentAuthor() : "null");
                } catch (Exception e) {
                    log.error("Error mapping report {}: {}", report.getId(), e.getMessage(), e);
                    // Continue with other reports even if one fails
                }
            }

            log.debug("Successfully converted {} reports to response DTOs", responseList.size());

            return new PageImpl<>(responseList, pageable, reports.getTotalElements());
        } catch (Exception e) {
            log.error("Error fetching reported content: {}", e.getMessage(), e);
            log.error("Stack trace: ", e);
            throw new RuntimeException("Failed to fetch reported content: " + e.getMessage(), e);
        }
    }

    private ModerationResponse mapToModerationResponse(ContentReport report) {
        ModerationResponse.ModerationResponseBuilder builder = ModerationResponse.builder()
            .id(report.getId())
            .contentType(report.getContentType())
            .contentId(report.getContentId())
            .reportReason(report.getReason())
            .reportDescription(report.getDescription())
            .status(report.getStatus())
            .priority(report.getPriority())
            .isAutoFlagged(report.getIsAutoFlagged())
            .autoFlagReason(report.getAutoFlagReason())
            .reportCount(report.getReportCount())
            .reportedAt(report.getCreatedAt())
            .createdAt(report.getCreatedAt())
            .moderationAction(report.getModerationAction())
            .moderationReason(report.getModerationReason())
            .moderatedAt(report.getModeratedAt());

        // Set reporter information - access within transaction
        try {
            User reporter = report.getReporter();
            if (reporter != null) {
                // Access fields - this will trigger lazy loading if needed
                String reporterName = reporter.getName();
                String reporterEmail = reporter.getEmail();
                builder.reportedBy(reporterName != null && !reporterName.isEmpty() ? reporterName : reporterEmail);
                builder.reporterId(reporter.getId());
            }
        } catch (org.hibernate.LazyInitializationException e) {
            log.warn("Lazy initialization error for reporter in report {}: {}", report.getId(), e.getMessage());
            // Try to fetch reporter separately if lazy load failed
            try {
                // This shouldn't happen if transaction is properly configured, but handle it anyway
                log.debug("Attempting to fetch reporter separately for report {}", report.getId());
            } catch (Exception ex) {
                log.warn("Could not fetch reporter for report {}: {}", report.getId(), ex.getMessage());
            }
        } catch (Exception e) {
            log.warn("Error accessing reporter information for report {}: {}", report.getId(), e.getMessage());
        }

        // Set moderator information - access within transaction
        try {
            User moderator = report.getModeratedBy();
            if (moderator != null) {
                // Access fields - this will trigger lazy loading if needed
                String moderatorName = moderator.getName();
                String moderatorEmail = moderator.getEmail();
                builder.moderatedBy(moderatorName != null && !moderatorName.isEmpty() ? moderatorName : moderatorEmail);
                builder.moderatorId(moderator.getId());
            }
        } catch (org.hibernate.LazyInitializationException e) {
            log.warn("Lazy initialization error for moderator in report {}: {}", report.getId(), e.getMessage());
        } catch (Exception e) {
            log.warn("Error accessing moderator information for report {}: {}", report.getId(), e.getMessage());
        }

        // Get content details based on content type
        try {
            if ("POST".equalsIgnoreCase(report.getContentType())) {
                Optional<Post> postOpt = postRepository.findById(report.getContentId());
                if (postOpt.isPresent()) {
                    Post post = postOpt.get();
                    log.debug("Found post {} for report {}", report.getContentId(), report.getId());
                    
                    String content = post.getContent();
                    log.debug("Post content for report {}: length={}, content={}", 
                        report.getId(), content != null ? content.length() : 0, 
                        content != null && content.length() > 50 ? content.substring(0, 50) + "..." : content);
                    
                    // For moderation, show FULL content, not truncated preview
                    if (content != null && !content.trim().isEmpty()) {
                        builder.contentPreview(content); // Show full content for moderation decisions
                        log.debug("Set contentPreview for report {} (full content, length: {})", report.getId(), content.length());
                    } else {
                        log.warn("Post {} has null or empty content for report {}", report.getContentId(), report.getId());
                        builder.contentPreview("(Post content is empty or unavailable)");
                    }
                    
                    // Include additional post metadata for better moderation context
                    builder.category(post.getCategory());
                    builder.contentCreatedAt(post.getCreatedAt());
                    
                    // Include media information so moderators can see attached images/videos
                    if (post.getMediaUrls() != null && !post.getMediaUrls().isEmpty()) {
                        builder.mediaUrls(post.getMediaUrls());
                        builder.mediaTypes(post.getMediaTypes());
                        log.debug("Post {} has {} media files attached for report {}", 
                            report.getContentId(), post.getMediaUrls().size(), report.getId());
                    }
                    
                    // Safely access post user - might be lazy loaded
                    try {
                        if (post.getUser() != null) {
                            String authorName = post.getUser().getName();
                            String authorEmail = post.getUser().getEmail();
                            builder.contentAuthor(authorName != null && !authorName.isEmpty() ? authorName : authorEmail);
                            builder.contentAuthorId(post.getUser().getId());
                            log.debug("Set contentAuthor for report {}: {}", report.getId(), 
                                authorName != null && !authorName.isEmpty() ? authorName : authorEmail);
                        } else {
                            log.warn("Post {} has null user for report {}", report.getContentId(), report.getId());
                        }
                    } catch (Exception e) {
                        log.warn("Could not access post author for report {}: {}", report.getId(), e.getMessage(), e);
                    }
                    builder.isVisible(true); // Post visibility logic can be enhanced later
                    // Check if post is hidden
                    Boolean isHidden = post.getIsHidden();
                    builder.isHidden(isHidden != null && isHidden);
                } else {
                    log.warn("Post {} not found for report {}", report.getContentId(), report.getId());
                    builder.contentPreview("(Post has been deleted)");
                    builder.isVisible(false);
                    builder.isHidden(false);
                }
            }
            // Add other content types (COMMENT, PRAYER, etc.) as needed
        } catch (Exception e) {
            log.error("Error fetching content details for report {}: {}", report.getId(), e.getMessage(), e);
        }

        return builder.build();
    }

    public void moderateContent(String contentType, UUID contentId, String action, String reason, UUID moderatorId, HttpServletRequest request) {
        log.info("Moderating {} {} with action: {} by moderator: {}", contentType, contentId, action, moderatorId);

        // Get moderator user entity
        User moderator = userRepository.findById(moderatorId)
            .orElseThrow(() -> new RuntimeException("Moderator user not found: " + moderatorId));

        // Handle WARN action - warn the content author
        if ("WARN".equalsIgnoreCase(action)) {
            try {
                // Get the content author based on content type
                UUID authorId = getContentAuthorId(contentType, contentId);
                if (authorId != null) {
                    String warnMessage = reason != null ? reason : "Your content violates community guidelines. Please review our community standards.";
                    userManagementService.warnUser(
                        authorId, 
                        reason != null ? reason : "Content violation",
                        warnMessage,
                        moderatorId,
                        contentType,
                        contentId
                    );
                    log.info("Warning issued to user {} for {} {}: {}", authorId, contentType, contentId, reason);
                } else {
                    log.warn("Could not find author for {} {} to warn", contentType, contentId);
                }
            } catch (Exception e) {
                log.error("Error warning user for {} {}: {}", contentType, contentId, e.getMessage(), e);
                // Don't fail the entire moderation if warning fails
            }
            // Continue to mark reports as resolved even if warning fails
        }

        // Perform the moderation action based on content type
        switch (contentType.toUpperCase()) {
            case "POST":
                moderatePost(contentId, action, reason, moderator);
                break;
            case "PRAYER":
                moderatePrayer(contentId, action, reason);
                break;
            case "ANNOUNCEMENT":
                moderateAnnouncement(contentId, action, reason);
                break;
            case "MESSAGE":
                moderateMessage(contentId, action, reason);
                break;
            case "COMMENT":
                moderateComment(contentId, action, reason);
                break;
            default:
                throw new IllegalArgumentException("Unsupported content type: " + contentType);
        }

        // Update all reports for this content to RESOLVED
        List<ContentReport> reports;
        try {
            reports = contentReportRepository
                .findByContentTypeAndContentIdOrderByCreatedAtDesc(contentType, contentId, 
                    org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE))
                .getContent();

            log.debug("Found {} reports for {} {} to update", reports.size(), contentType, contentId);

            LocalDateTime now = LocalDateTime.now();
            int updatedCount = 0;
            for (ContentReport report : reports) {
                if ("PENDING".equals(report.getStatus()) || "REVIEWING".equals(report.getStatus())) {
                    report.setStatus("RESOLVED");
                    report.setModerationAction(action.toUpperCase());
                    report.setModerationReason(reason);
                    report.setModeratedBy(moderator);
                    report.setModeratedAt(now);
                    contentReportRepository.save(report);
                    updatedCount++;
                    log.debug("Updated report {} to RESOLVED with action: {}", report.getId(), action);
                }
            }

            log.info("Moderated {} {} with action: {} - Updated {}/{} reports to RESOLVED", 
                contentType, contentId, action, updatedCount, reports.size());
        } catch (Exception e) {
            log.error("Error updating reports for {} {}: {}", contentType, contentId, e.getMessage(), e);
            // Don't fail the entire moderation if report update fails
            // The content moderation itself succeeded
            reports = new ArrayList<>();
        }

        // Log the moderation action
        Map<String, String> details = new HashMap<>();
        details.put("action", action);
        details.put("reason", reason);
        details.put("contentType", contentType);
        details.put("reportsResolved", String.valueOf(reports.size()));
        auditLogService.logContentAction(moderatorId, "MODERATE_CONTENT", contentType, contentId, details, request);
    }

    public void reportContent(String contentType, UUID contentId, String reason, String description, UUID reporterId, HttpServletRequest request) {
        log.info("Reporting {} {} by user {} for: {}", contentType, contentId, reporterId, reason);

        // Check if user has already reported this content (pending or reviewing)
        Optional<ContentReport> existingReport = contentReportRepository
            .findByContentTypeAndContentIdAndReporterIdAndStatusIn(
                contentType, contentId, reporterId, 
                Arrays.asList("PENDING", "REVIEWING"));

        if (existingReport.isPresent()) {
            log.info("User {} already has a pending/reviewing report for {} {}", reporterId, contentType, contentId);
            // Don't create duplicate report, but still log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason);
            details.put("description", description);
            details.put("contentType", contentType);
            details.put("note", "Duplicate report - already pending");
            auditLogService.logContentAction(reporterId, "REPORT_CONTENT", contentType, contentId, details, request);
            return;
        }

        // Get reporter user entity
        User reporter = userRepository.findById(reporterId)
            .orElseThrow(() -> new RuntimeException("Reporter user not found: " + reporterId));

        // Count existing reports for this content to determine priority
        long existingReportCount = contentReportRepository.countByContentTypeAndContentId(contentType, contentId);
        String priority = determinePriority(reason, existingReportCount);

        // Create new report
        ContentReport report = ContentReport.builder()
            .contentType(contentType.toUpperCase())
            .contentId(contentId)
            .reporter(reporter)
            .reason(reason.toUpperCase())
            .description(description)
            .status("PENDING")
            .priority(priority)
            .isAutoFlagged(false)
            .reportCount((int)(existingReportCount + 1))
            .build();

        ContentReport savedReport = contentReportRepository.save(report);
        log.info("Created content report with ID: {} for {} {} (priority: {})", 
            savedReport.getId(), contentType, contentId, priority);

        // Log the report action
        Map<String, String> details = new HashMap<>();
        details.put("reason", reason);
        details.put("description", description);
        details.put("contentType", contentType);
        details.put("priority", priority);
        details.put("reportId", savedReport.getId().toString());
        auditLogService.logContentAction(reporterId, "REPORT_CONTENT", contentType, contentId, details, request);

        // TODO: Auto-flag content if it meets certain criteria
        // TODO: Send notification to moderators
    }

    private String determinePriority(String reason, long existingReportCount) {
        // High priority for serious violations
        if (reason != null) {
            String upperReason = reason.toUpperCase();
            if (upperReason.contains("HARASSMENT") || upperReason.contains("HATE_SPEECH") || 
                upperReason.contains("DISCRIMINATION")) {
                return "HIGH";
            }
        }

        // If content has been reported multiple times, increase priority
        if (existingReportCount >= 5) {
            return "HIGH";
        } else if (existingReportCount >= 3) {
            return "MEDIUM";
        }

        // Default priority
        return "MEDIUM";
    }

    public Map<String, Object> getModerationStats(String timeRange) {
        Map<String, Object> stats = new HashMap<>();

        // TODO: Implement actual statistics
        stats.put("totalReports", 0L);
        stats.put("activeReports", 0L);
        stats.put("resolvedReports", 0L);
        stats.put("contentRemoved", 0L);
        stats.put("contentApproved", 0L);
        stats.put("averageResolutionTime", "2.5 hours");
        stats.put("mostReportedCategory", "Spam");

        return stats;
    }

    public Page<ModerationResponse> getFlaggedContent(Pageable pageable, String contentType) {
        // TODO: Implement auto-flagged content retrieval
        List<ModerationResponse> flagged = new ArrayList<>();
        return new PageImpl<>(flagged, pageable, flagged.size());
    }

    public Map<String, Object> bulkModerate(List<String> contentIds, String action, String reason, UUID moderatorId, HttpServletRequest request) {
        Map<String, Object> result = new HashMap<>();
        int successCount = 0;
        int errorCount = 0;
        List<String> errors = new ArrayList<>();

        for (String contentIdStr : contentIds) {
            try {
                UUID.fromString(contentIdStr); // Validate UUID format
                // TODO: Determine content type and moderate accordingly
                // For now, assume it's handled by the moderateContent method

                successCount++;
            } catch (Exception e) {
                errorCount++;
                errors.add("Failed to moderate " + contentIdStr + ": " + e.getMessage());
                log.error("Error in bulk moderation for content {}: {}", contentIdStr, e.getMessage());
            }
        }

        // Log bulk moderation action
        Map<String, String> details = new HashMap<>();
        details.put("action", action);
        details.put("reason", reason);
        details.put("totalItems", String.valueOf(contentIds.size()));
        details.put("successCount", String.valueOf(successCount));
        details.put("errorCount", String.valueOf(errorCount));
        auditLogService.logAction(moderatorId, "BULK_MODERATE", details, "CONTENT", null, request);

        result.put("totalProcessed", contentIds.size());
        result.put("successful", successCount);
        result.put("failed", errorCount);
        result.put("errors", errors);

        return result;
    }

    public void updateModerationSettings(Map<String, Object> settings) {
        // TODO: Implement moderation settings update
        log.info("Updating moderation settings: {}", settings);

        // Settings might include:
        // - Auto-moderation rules
        // - Keyword filters
        // - Report thresholds
        // - Notification preferences
    }

    public List<Map<String, Object>> getModerationHistory(String contentType, UUID contentId) {
        // TODO: Implement moderation history retrieval from audit logs
        List<Map<String, Object>> history = new ArrayList<>();

        // Sample data
        Map<String, Object> action = new HashMap<>();
        action.put("action", "REPORTED");
        action.put("timestamp", LocalDateTime.now().minusHours(1));
        action.put("moderator", "System");
        action.put("reason", "Auto-flagged for review");
        history.add(action);

        return history;
    }

    // Content-specific moderation methods
    /**
     * Get the author ID for a given content type and content ID
     */
    private UUID getContentAuthorId(String contentType, UUID contentId) {
        try {
            switch (contentType.toUpperCase()) {
                case "POST":
                    Optional<Post> postOpt = postRepository.findById(contentId);
                    if (postOpt.isPresent() && postOpt.get().getUser() != null) {
                        return postOpt.get().getUser().getId();
                    }
                    break;
                // Add other content types as needed (COMMENT, PRAYER, etc.)
                default:
                    log.warn("Unknown content type for getting author: {}", contentType);
                    return null;
            }
        } catch (Exception e) {
            log.error("Error getting author ID for {} {}: {}", contentType, contentId, e.getMessage());
        }
        return null;
    }

    private void moderatePost(UUID postId, String action, String reason, User moderator) {
        Optional<Post> postOpt = postRepository.findById(postId);
        if (postOpt.isEmpty()) {
            log.warn("Post {} not found for moderation - may have already been deleted. Action: {}", postId, action);
            // Don't throw exception - just log and return. Reports will still be marked as resolved.
            // This handles cases where the post was already deleted but reports still exist.
            return;
        }

        Post post = postOpt.get();
        String upperAction = action.toUpperCase();

        try {
            switch (upperAction) {
                case "REMOVE":
                    // Hard delete the post permanently
                    log.info("Removing post {} - Reason: {}", postId, reason);
                    cleanupPostData(postId);
                    postRepository.delete(post);
                    log.info("Post {} has been removed", postId);
                    break;

                case "APPROVE":
                    // Approve content - do nothing, just mark reports as resolved
                    log.info("Approving post {} - Reason: {}", postId, reason);
                    break;

                case "HIDE":
                    // Hide post from public view (still visible to author on their profile)
                    log.info("Hiding post {} - Reason: {}", postId, reason);
                    post.setIsHidden(true);
                    post.setHiddenAt(LocalDateTime.now());
                    post.setHiddenBy(moderator);
                    postRepository.save(post);
                    log.info("Post {} has been hidden (still visible to author)", postId);
                    break;

                case "UNHIDE":
                    // Unhide a previously hidden post
                    log.info("Unhiding post {} - Reason: {}", postId, reason);
                    post.setIsHidden(false);
                    post.setHiddenAt(null);
                    post.setHiddenBy(null);
                    postRepository.save(post);
                    log.info("Post {} has been unhidden", postId);
                    break;

                case "WARN":
                    // Warn - do nothing to content, just mark reports as resolved
                    // Warning is handled separately via warnUser service
                    log.info("Warning for post {} - Reason: {}", postId, reason);
                    // Note: warnUser should be called separately from the controller
                    break;

                default:
                    log.warn("Unknown moderation action: {} for post {}", action, postId);
                    throw new IllegalArgumentException("Unknown moderation action: " + action);
            }
        } catch (Exception e) {
            log.error("Error moderating post {} with action {}: {}", postId, action, e.getMessage(), e);
            throw new RuntimeException("Failed to moderate post: " + e.getMessage(), e);
        }
    }

    private void cleanupPostData(UUID postId) {
        // Clean up related data when deleting a post
        // Note: This method is called from within a transactional method, so no @Transactional needed
        try {
            log.debug("Cleaning up related data for post {}", postId);
            // Delete comments
            postCommentRepository.deleteByPostId(postId);
            // Delete likes
            postLikeRepository.deleteByPostId(postId);
            // Delete bookmarks
            postBookmarkRepository.deleteByPostId(postId);
            // Delete shares
            postShareRepository.deleteByPostId(postId);
            log.debug("Successfully cleaned up related data for post {}", postId);
        } catch (Exception e) {
            log.error("Error cleaning up post data for {}: {}", postId, e.getMessage(), e);
            throw new RuntimeException("Failed to cleanup post data: " + e.getMessage(), e);
        }
    }

    private void moderatePrayer(UUID prayerId, String action, String reason) {
        // TODO: Implement prayer moderation
        log.info("Moderating prayer {} with action: {}", prayerId, action);
    }

    private void moderateAnnouncement(UUID announcementId, String action, String reason) {
        // TODO: Implement announcement moderation
        log.info("Moderating announcement {} with action: {}", announcementId, action);
    }

    private void moderateMessage(UUID messageId, String action, String reason) {
        // TODO: Implement message moderation
        log.info("Moderating message {} with action: {}", messageId, action);
    }

    private void moderateComment(UUID commentId, String action, String reason) {
        // TODO: Implement comment moderation
        log.info("Moderating comment {} with action: {}", commentId, action);
    }
}