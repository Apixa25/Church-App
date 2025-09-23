package com.churchapp.controller;

import com.churchapp.dto.ModerationResponse;
import com.churchapp.service.ContentModerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin/moderation")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
public class ContentModerationController {

    private final ContentModerationService contentModerationService;

    /**
     * Get all reported content across all sections
     */
    @GetMapping("/reports")
    public ResponseEntity<Page<ModerationResponse>> getReportedContent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String contentType,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority) {

        try {
            log.info("Fetching reported content: page={}, size={}, type={}, status={}, priority={}",
                page, size, contentType, status, priority);

            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "reportedAt"));
            Page<ModerationResponse> reports = contentModerationService.getReportedContent(
                pageable, contentType, status, priority);

            return ResponseEntity.ok(reports);

        } catch (Exception e) {
            log.error("Error fetching reported content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch reported content", e);
        }
    }

    /**
     * Moderate specific content (approve, remove, hide, warn)
     */
    @PostMapping("/content/{contentType}/{contentId}/moderate")
    public ResponseEntity<Map<String, String>> moderateContent(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String action = request.get("action"); // approve, remove, hide, warn
            String reason = request.get("reason");

            log.info("Moderating {} {} with action: {} by admin: {}",
                contentType, contentId, action, auth.getName());

            contentModerationService.moderateContent(
                contentType, contentId, action, reason,
                UUID.fromString(auth.getName()), httpRequest);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Content moderation action completed successfully");
            response.put("action", action);
            response.put("contentType", contentType);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error moderating content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to moderate content", e);
        }
    }

    /**
     * Report content for moderation
     */
    @PostMapping("/content/{contentType}/{contentId}/report")
    public ResponseEntity<Map<String, String>> reportContent(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String reason = request.get("reason");
            String description = request.get("description");

            log.info("Reporting {} {} by user: {} for reason: {}",
                contentType, contentId, auth.getName(), reason);

            contentModerationService.reportContent(
                contentType, contentId, reason, description,
                UUID.fromString(auth.getName()), httpRequest);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Content reported successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error reporting content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to report content", e);
        }
    }

    /**
     * Get moderation statistics
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getModerationStats(
            @RequestParam(defaultValue = "30d") String timeRange) {

        try {
            Map<String, Object> stats = contentModerationService.getModerationStats(timeRange);
            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("Error fetching moderation stats: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch moderation stats", e);
        }
    }

    /**
     * Get content requiring moderation (auto-flagged)
     */
    @GetMapping("/flagged")
    public ResponseEntity<Page<ModerationResponse>> getFlaggedContent(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String contentType) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<ModerationResponse> flagged = contentModerationService.getFlaggedContent(
                pageable, contentType);

            return ResponseEntity.ok(flagged);

        } catch (Exception e) {
            log.error("Error fetching flagged content: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch flagged content", e);
        }
    }

    /**
     * Bulk moderate multiple content items
     */
    @PostMapping("/bulk-moderate")
    public ResponseEntity<Map<String, Object>> bulkModerate(
            @RequestBody Map<String, Object> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            @SuppressWarnings("unchecked")
            java.util.List<String> contentIds = (java.util.List<String>) request.get("contentIds");
            String action = (String) request.get("action");
            String reason = (String) request.get("reason");

            log.info("Bulk moderating {} items with action: {} by admin: {}",
                contentIds.size(), action, auth.getName());

            Map<String, Object> result = contentModerationService.bulkModerate(
                contentIds, action, reason,
                UUID.fromString(auth.getName()), httpRequest);

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Error in bulk moderation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to perform bulk moderation", e);
        }
    }

    /**
     * Update moderation settings
     */
    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateModerationSettings(
            @RequestBody Map<String, Object> settings,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            log.info("Updating moderation settings by admin: {}", auth.getName());

            contentModerationService.updateModerationSettings(settings);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Moderation settings updated successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error updating moderation settings: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update moderation settings", e);
        }
    }

    /**
     * Get moderation history for specific content
     */
    @GetMapping("/content/{contentType}/{contentId}/history")
    public ResponseEntity<java.util.List<Map<String, Object>>> getModerationHistory(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        try {
            java.util.List<Map<String, Object>> history =
                contentModerationService.getModerationHistory(contentType, contentId);

            return ResponseEntity.ok(history);

        } catch (Exception e) {
            log.error("Error fetching moderation history: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch moderation history", e);
        }
    }
}