package com.churchapp.controller;

import com.churchapp.dto.AdminAnalyticsResponse;
import com.churchapp.dto.UserManagementResponse;
import com.churchapp.entity.AuditLog;
import com.churchapp.entity.User;
import com.churchapp.service.AdminAnalyticsService;
import com.churchapp.service.AuditLogService;
import com.churchapp.service.UserManagementService;
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
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN') or hasRole('MODERATOR')")
public class AdminController {

    private final UserManagementService userManagementService;
    private final AdminAnalyticsService adminAnalyticsService;
    private final AuditLogService auditLogService;

    // =============== USER MANAGEMENT ===============

    /**
     * Get all users with pagination and filtering
     */
    @GetMapping("/users")
    public ResponseEntity<Page<UserManagementResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean banned) {

        try {
            log.info("Fetching users: page={}, size={}, search={}, role={}, banned={}",
                page, size, search, role, banned);

            Sort.Direction direction = sortDirection.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

            Page<UserManagementResponse> users = userManagementService.getUsers(
                pageable, search, role, banned);

            return ResponseEntity.ok(users);

        } catch (Exception e) {
            log.error("Error fetching users: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch users", e);
        }
    }

    /**
     * Get user details by ID
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserManagementResponse> getUserDetails(@PathVariable UUID userId) {
        try {
            UserManagementResponse user = userManagementService.getUserDetails(userId);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Error fetching user details for ID: {}", userId, e);
            throw new RuntimeException("Failed to fetch user details", e);
        }
    }

    /**
     * Update user role
     */
    @PutMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateUserRole(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String newRole = request.get("role");
            String reason = request.get("reason");

            log.info("Admin {} updating user {} role to: {}", auth.getName(), userId, newRole);

            userManagementService.updateUserRole(userId, newRole);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("newRole", newRole);
            details.put("reason", reason != null ? reason : "No reason provided");
            auditLogService.logUserAction(
                UUID.fromString(auth.getName()),
                "UPDATE_USER_ROLE",
                details,
                httpRequest
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "User role updated successfully");
            response.put("newRole", newRole);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error updating user role: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to update user role", e);
        }
    }

    /**
     * Ban a user
     */
    @PostMapping("/users/{userId}/ban")
    public ResponseEntity<Map<String, String>> banUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String reason = request.get("reason");
            String duration = request.get("duration"); // "permanent", "7d", "30d", etc.

            log.info("Admin {} banning user {} for reason: {}", auth.getName(), userId, reason);

            userManagementService.banUser(userId, reason, duration);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason != null ? reason : "No reason provided");
            details.put("duration", duration != null ? duration : "permanent");
            auditLogService.logUserAction(
                UUID.fromString(auth.getName()),
                "BAN_USER",
                details,
                httpRequest
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "User banned successfully");
            response.put("reason", reason);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error banning user: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to ban user", e);
        }
    }

    /**
     * Unban a user
     */
    @PostMapping("/users/{userId}/unban")
    public ResponseEntity<Map<String, String>> unbanUser(
            @PathVariable UUID userId,
            @RequestBody(required = false) Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String reason = request != null ? request.get("reason") : "Admin action";

            log.info("Admin {} unbanning user {}", auth.getName(), userId);

            userManagementService.unbanUser(userId);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason);
            auditLogService.logUserAction(
                UUID.fromString(auth.getName()),
                "UNBAN_USER",
                details,
                httpRequest
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "User unbanned successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error unbanning user: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to unban user", e);
        }
    }

    /**
     * Issue warning to user
     */
    @PostMapping("/users/{userId}/warn")
    public ResponseEntity<Map<String, String>> warnUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String reason = request.get("reason");
            String message = request.get("message");

            log.info("Admin {} warning user {} for: {}", auth.getName(), userId, reason);

            userManagementService.warnUser(userId, reason, message);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason != null ? reason : "No reason provided");
            details.put("message", message != null ? message : "No message");
            auditLogService.logUserAction(
                UUID.fromString(auth.getName()),
                "WARN_USER",
                details,
                httpRequest
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "Warning issued successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error warning user: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to warn user", e);
        }
    }

    /**
     * Delete user account (admin only)
     */
    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String reason = request.get("reason");

            log.info("Admin {} deleting user {} for: {}", auth.getName(), userId, reason);

            userManagementService.deleteUser(userId);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason != null ? reason : "No reason provided");
            auditLogService.logUserAction(
                UUID.fromString(auth.getName()),
                "DELETE_USER",
                details,
                httpRequest
            );

            Map<String, String> response = new HashMap<>();
            response.put("message", "User deleted successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error deleting user: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to delete user", e);
        }
    }

    // =============== ANALYTICS ===============

    /**
     * Get comprehensive admin analytics
     */
    @GetMapping("/analytics")
    public ResponseEntity<AdminAnalyticsResponse> getAnalytics(
            @RequestParam(defaultValue = "30d") String timeRange) {

        try {
            log.info("Fetching admin analytics for time range: {}", timeRange);

            AdminAnalyticsResponse analytics = adminAnalyticsService.getAnalytics(timeRange);

            return ResponseEntity.ok(analytics);

        } catch (Exception e) {
            log.error("Error fetching admin analytics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch analytics", e);
        }
    }

    /**
     * Get user activity analytics
     */
    @GetMapping("/analytics/users")
    public ResponseEntity<Map<String, Object>> getUserAnalytics(
            @RequestParam(defaultValue = "30d") String timeRange) {

        try {
            Map<String, Object> userAnalytics = adminAnalyticsService.getUserAnalytics(timeRange);
            return ResponseEntity.ok(userAnalytics);

        } catch (Exception e) {
            log.error("Error fetching user analytics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch user analytics", e);
        }
    }

    /**
     * Get content analytics
     */
    @GetMapping("/analytics/content")
    public ResponseEntity<Map<String, Object>> getContentAnalytics(
            @RequestParam(defaultValue = "30d") String timeRange) {

        try {
            Map<String, Object> contentAnalytics = adminAnalyticsService.getContentAnalytics(timeRange);
            return ResponseEntity.ok(contentAnalytics);

        } catch (Exception e) {
            log.error("Error fetching content analytics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch content analytics", e);
        }
    }

    // =============== AUDIT LOGS ===============

    /**
     * Get audit logs with pagination and filtering
     */
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLog>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));

            Page<AuditLog> auditLogs;

            if (userId != null) {
                auditLogs = auditLogService.getAuditLogsByUser(userId, pageable);
            } else if (action != null) {
                auditLogs = auditLogService.getAuditLogsByAction(action, pageable);
            } else if (startDate != null && endDate != null) {
                LocalDateTime start = LocalDateTime.parse(startDate);
                LocalDateTime end = LocalDateTime.parse(endDate);
                auditLogs = auditLogService.getAuditLogsByDateRange(start, end, pageable);
            } else {
                auditLogs = auditLogService.getAuditLogs(pageable);
            }

            return ResponseEntity.ok(auditLogs);

        } catch (Exception e) {
            log.error("Error fetching audit logs: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch audit logs", e);
        }
    }

    /**
     * Get audit statistics
     */
    @GetMapping("/audit-logs/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAuditStats(
            @RequestParam(defaultValue = "30d") String timeRange) {

        try {
            LocalDateTime since = calculateSinceDate(timeRange);
            Map<String, Long> actionStats = auditLogService.getActionStatistics(since);
            List<String> availableActions = auditLogService.getAvailableActions();

            Map<String, Object> stats = new HashMap<>();
            stats.put("actionCounts", actionStats);
            stats.put("availableActions", availableActions);
            stats.put("timeRange", timeRange);

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("Error fetching audit statistics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch audit statistics", e);
        }
    }

    // =============== SYSTEM HEALTH ===============

    /**
     * Get system health and status
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getSystemHealth() {
        try {
            Map<String, Object> health = adminAnalyticsService.getSystemHealth();
            return ResponseEntity.ok(health);

        } catch (Exception e) {
            log.error("Error fetching system health: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch system health", e);
        }
    }

    // =============== HELPER METHODS ===============

    private LocalDateTime calculateSinceDate(String timeRange) {
        LocalDateTime now = LocalDateTime.now();
        switch (timeRange.toLowerCase()) {
            case "1d":
                return now.minusDays(1);
            case "7d":
                return now.minusDays(7);
            case "30d":
                return now.minusDays(30);
            case "90d":
                return now.minusDays(90);
            case "1y":
                return now.minusYears(1);
            default:
                return now.minusDays(30);
        }
    }
}