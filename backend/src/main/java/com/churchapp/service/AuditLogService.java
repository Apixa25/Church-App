package com.churchapp.service;

import com.churchapp.entity.AuditLog;
import com.churchapp.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void logAction(UUID userId, String action, Map<String, String> details,
                         String targetType, UUID targetId, HttpServletRequest request) {
        try {
            AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .action(action)
                .details(details != null ? details : new HashMap<>())
                .targetType(targetType)
                .targetId(targetId)
                .ipAddress(getClientIpAddress(request))
                .userAgent(request.getHeader("User-Agent"))
                .timestamp(LocalDateTime.now())
                .build();

            auditLogRepository.save(auditLog);
            log.info("Audit log created: {} by user {} on {} {}", action, userId, targetType, targetId);
        } catch (Exception e) {
            log.error("Failed to create audit log for action: {} by user: {}", action, userId, e);
        }
    }

    public void logUserAction(UUID userId, String action, Map<String, String> details, HttpServletRequest request) {
        logAction(userId, action, details, "USER", userId, request);
    }

    public void logContentAction(UUID userId, String action, String contentType, UUID contentId,
                                Map<String, String> details, HttpServletRequest request) {
        logAction(userId, action, details, contentType.toUpperCase(), contentId, request);
    }

    public Page<AuditLog> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
    }

    public Page<AuditLog> getAuditLogsByUser(UUID userId, Pageable pageable) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId, pageable);
    }

    public Page<AuditLog> getAuditLogsByAction(String action, Pageable pageable) {
        return auditLogRepository.findByActionOrderByTimestampDesc(action, pageable);
    }

    public Page<AuditLog> getAuditLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable) {
        return auditLogRepository.findByTimestampBetween(startDate, endDate, pageable);
    }

    public List<AuditLog> getAuditLogsForTarget(String targetType, UUID targetId) {
        return auditLogRepository.findByTargetTypeAndTargetIdOrderByTimestampDesc(targetType, targetId);
    }

    public Map<String, Long> getActionStatistics(LocalDateTime since) {
        Map<String, Long> stats = new HashMap<>();
        List<Object[]> results = auditLogRepository.getActionCountsSince(since);

        for (Object[] result : results) {
            stats.put((String) result[0], (Long) result[1]);
        }

        return stats;
    }

    public List<String> getAvailableActions() {
        return auditLogRepository.findDistinctActions();
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}