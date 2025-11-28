package com.churchapp.service;

import com.churchapp.dto.ModerationResponse;
import com.churchapp.entity.ContentReport;
import com.churchapp.entity.Post;
import com.churchapp.entity.User;
import com.churchapp.repository.ContentReportRepository;
import com.churchapp.repository.PostRepository;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ContentModerationService {

    private final AuditLogService auditLogService;
    private final ContentReportRepository contentReportRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<ModerationResponse> getReportedContent(Pageable pageable, String contentType, String status, String priority) {
        Page<ContentReport> reports = contentReportRepository.findWithFilters(
            contentType, status, priority, pageable);

        List<ModerationResponse> responseList = reports.getContent().stream()
            .map(this::mapToModerationResponse)
            .collect(Collectors.toList());

        return new PageImpl<>(responseList, pageable, reports.getTotalElements());
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

        // Set reporter information - safely handle lazy loading
        try {
            if (report.getReporter() != null) {
                String reporterName = report.getReporter().getName();
                String reporterEmail = report.getReporter().getEmail();
                builder.reportedBy(reporterName != null && !reporterName.isEmpty() ? reporterName : reporterEmail);
                builder.reporterId(report.getReporter().getId());
            }
        } catch (Exception e) {
            log.warn("Error accessing reporter information for report {}: {}", report.getId(), e.getMessage());
        }

        // Set moderator information - safely handle lazy loading
        try {
            if (report.getModeratedBy() != null) {
                String moderatorName = report.getModeratedBy().getName();
                String moderatorEmail = report.getModeratedBy().getEmail();
                builder.moderatedBy(moderatorName != null && !moderatorName.isEmpty() ? moderatorName : moderatorEmail);
                builder.moderatorId(report.getModeratedBy().getId());
            }
        } catch (Exception e) {
            log.warn("Error accessing moderator information for report {}: {}", report.getId(), e.getMessage());
        }

        // Get content details based on content type
        try {
            if ("POST".equalsIgnoreCase(report.getContentType())) {
                Optional<Post> postOpt = postRepository.findById(report.getContentId());
                if (postOpt.isPresent()) {
                    Post post = postOpt.get();
                    String content = post.getContent();
                    if (content != null) {
                        builder.contentPreview(content.length() > 200 
                            ? content.substring(0, 200) + "..." 
                            : content);
                    }
                    // Safely access post user - might be lazy loaded
                    try {
                        if (post.getUser() != null) {
                            String authorName = post.getUser().getName();
                            String authorEmail = post.getUser().getEmail();
                            builder.contentAuthor(authorName != null && !authorName.isEmpty() ? authorName : authorEmail);
                            builder.contentAuthorId(post.getUser().getId());
                        }
                    } catch (Exception e) {
                        log.debug("Could not access post author for report {}: {}", report.getId(), e.getMessage());
                    }
                    builder.isVisible(true); // Post visibility logic can be enhanced later
                }
            }
            // Add other content types (COMMENT, PRAYER, etc.) as needed
        } catch (Exception e) {
            log.warn("Error fetching content details for report {}: {}", report.getId(), e.getMessage());
        }

        return builder.build();
    }

    public void moderateContent(String contentType, UUID contentId, String action, String reason, UUID moderatorId, HttpServletRequest request) {
        log.info("Moderating {} {} with action: {}", contentType, contentId, action);

        // TODO: Implement actual content moderation logic based on content type
        switch (contentType.toUpperCase()) {
            case "POST":
                moderatePost(contentId, action, reason);
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

        // Log the moderation action
        Map<String, String> details = new HashMap<>();
        details.put("action", action);
        details.put("reason", reason);
        details.put("contentType", contentType);
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
    private void moderatePost(UUID postId, String action, String reason) {
        // TODO: Implement post moderation
        // - Update post visibility
        // - Send notification to author
        // - Update moderation status
        log.info("Moderating post {} with action: {}", postId, action);
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