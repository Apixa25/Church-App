package com.churchapp.controller;

import com.churchapp.dto.AdminAnalyticsResponse;
import com.churchapp.dto.UserManagementResponse;
import com.churchapp.entity.AuditLog;
import com.churchapp.entity.User;
import com.churchapp.service.AdminAnalyticsService;
import com.churchapp.service.AdminAuthorizationService;
import com.churchapp.service.AuditLogService;
import com.churchapp.service.UserManagementService;
import com.churchapp.repository.UserRepository;
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
@PreAuthorize("@adminAuthorizationService.hasAnyAdminAccess(authentication.principal)")
public class AdminController {

    private final UserManagementService userManagementService;
    private final AdminAnalyticsService adminAnalyticsService;
    private final AuditLogService auditLogService;
    private final AdminAuthorizationService adminAuthService;
    private final UserRepository userRepository;

    // =============== USER MANAGEMENT ===============

    /**
     * Get all users with pagination and filtering
     * PLATFORM_ADMIN sees all users, ORG_ADMIN sees only users in their organization(s)
     */
    @GetMapping("/users")
    public ResponseEntity<Page<UserManagementResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean banned,
            Authentication auth) {

        try {
            // Get current user and their admin organization scope
            User currentUser = getCurrentUser(auth);
            List<UUID> orgIds = adminAuthService.getAdminOrganizationIds(currentUser);
            
            log.info("Fetching users: page={}, size={}, search={}, role={}, banned={}, orgScope={}",
                page, size, search, role, banned, 
                orgIds == null ? "ALL" : orgIds.size() + " orgs");

            Sort.Direction direction = sortDirection.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC;
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

            Page<UserManagementResponse> users = userManagementService.getUsers(
                pageable, search, role, banned, orgIds);

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
     * Update user role (Platform Admin only)
     */
    @PutMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
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

            // Get current admin user for audit logging
            User currentAdmin = getCurrentUser(auth);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("newRole", newRole);
            details.put("reason", reason != null ? reason : "No reason provided");
            auditLogService.logUserAction(
                currentAdmin.getId(),
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

            // Get current admin user for audit logging
            User currentAdmin = getCurrentUser(auth);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason != null ? reason : "No reason provided");
            details.put("duration", duration != null ? duration : "permanent");
            auditLogService.logUserAction(
                currentAdmin.getId(),
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

            // Get current admin user for audit logging
            User currentAdmin = getCurrentUser(auth);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason);
            auditLogService.logUserAction(
                currentAdmin.getId(),
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
            String contentType = request.get("contentType");
            String contentIdStr = request.get("contentId");
            UUID contentId = contentIdStr != null ? UUID.fromString(contentIdStr) : null;

            // Get moderator ID from email (auth.getName() returns email)
            String email = auth.getName();
            User moderator = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
            UUID moderatorId = moderator.getId();

            log.info("Admin {} warning user {} for: {}", auth.getName(), userId, reason);

            userManagementService.warnUser(userId, reason, message, moderatorId, contentType, contentId);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason != null ? reason : "No reason provided");
            details.put("message", message != null ? message : "No message");
            // moderatorId is already set from getCurrentUser above
            auditLogService.logUserAction(
                moderatorId,
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
     * Delete user account (Platform Admin only)
     */
    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable UUID userId,
            @RequestBody Map<String, String> request,
            Authentication auth,
            HttpServletRequest httpRequest) {

        try {
            String reason = request.get("reason");

            log.info("Admin {} deleting user {} for: {}", auth.getName(), userId, reason);

            userManagementService.deleteUser(userId);

            // Get current admin user for audit logging
            User currentAdmin = getCurrentUser(auth);

            // Log the action
            Map<String, String> details = new HashMap<>();
            details.put("reason", reason != null ? reason : "No reason provided");
            auditLogService.logUserAction(
                currentAdmin.getId(),
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
     * PLATFORM_ADMIN sees platform-wide analytics, ORG_ADMIN sees only their organization(s) analytics
     */
    @GetMapping("/analytics")
    public ResponseEntity<AdminAnalyticsResponse> getAnalytics(
            @RequestParam(defaultValue = "30d") String timeRange,
            Authentication auth) {

        try {
            // Get current user and their admin organization scope
            User currentUser = getCurrentUser(auth);
            List<UUID> orgIds = adminAuthService.getAdminOrganizationIds(currentUser);
            
            log.info("Fetching admin analytics for time range: {}, orgScope={}",
                timeRange, orgIds == null ? "ALL (Platform Admin)" : orgIds.size() + " org(s)");

            AdminAnalyticsResponse analytics = adminAnalyticsService.getAnalytics(timeRange, orgIds);

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
     * Get audit logs with pagination and filtering (Platform Admin only)
     */
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
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
     * Get audit statistics (Platform Admin only)
     */
    @GetMapping("/audit-logs/stats")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
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

    /**
     * Get the current authenticated user from the Authentication principal
     */
    private User getCurrentUser(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new RuntimeException("No authenticated user found");
        }
        
        String email;
        if (auth.getPrincipal() instanceof User) {
            return (User) auth.getPrincipal();
        } else if (auth.getPrincipal() instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal()).getUsername();
        } else {
            email = auth.getName();
        }
        
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

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