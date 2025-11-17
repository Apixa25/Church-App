package com.churchapp.config;

import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.OrganizationMetricsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;
import java.util.UUID;

/**
 * Interceptor to track API requests and data transfer per organization.
 * Tracks network traffic metrics for the metrics system.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OrganizationMetricsInterceptor implements HandlerInterceptor {

    private final OrganizationMetricsService metricsService;
    private final UserRepository userRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Note: We can't wrap request/response here as they're already passed by reference
        // ContentCachingRequestWrapper/ResponseWrapper would need to be added via Filter
        // For now, we'll calculate sizes from headers and estimate
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, 
                                Object handler, Exception ex) {
        try {
            // Skip tracking for certain paths
            String requestPath = request.getRequestURI();
            if (shouldSkipTracking(requestPath)) {
                return;
            }

            // Get authenticated user
            Optional<UUID> organizationId = getOrganizationIdFromRequest();
            
            if (organizationId.isEmpty()) {
                // No authenticated user or no primary organization
                return;
            }

            // Calculate request and response sizes
            // Note: For accurate sizes, ContentCachingRequestWrapper/ResponseWrapper 
            // would need to be added via a Filter. For now, we estimate from headers.
            long requestSize = calculateRequestSize(request);
            long responseSize = calculateResponseSize(response);
            long totalDataTransfer = requestSize + responseSize;
            
            // If we can't determine size from headers, use a minimum estimate
            // This ensures we still track the request count
            if (totalDataTransfer == 0) {
                totalDataTransfer = 1024; // 1KB minimum estimate per request
            }

            // Increment metrics
            metricsService.incrementApiRequest(organizationId.get(), totalDataTransfer);

            log.debug("Tracked API request for organization {}: {} bytes (req: {}, resp: {})",
                organizationId.get(), totalDataTransfer, requestSize, responseSize);

        } catch (Exception e) {
            // Don't let metrics tracking break the request
            log.warn("Error tracking metrics for request: {}", request.getRequestURI(), e);
        }
    }

    /**
     * Extract organization ID from authenticated user
     */
    private Optional<UUID> getOrganizationIdFromRequest() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null || !authentication.isAuthenticated()) {
                return Optional.empty();
            }

            Object principal = authentication.getPrincipal();
            
            if (!(principal instanceof UserDetails)) {
                return Optional.empty();
            }

            UserDetails userDetails = (UserDetails) principal;
            String email = userDetails.getUsername();

            // Get User entity to find primary organization
            Optional<User> userOpt = userRepository.findByEmail(email);
            
            if (userOpt.isEmpty()) {
                return Optional.empty();
            }

            User user = userOpt.get();
            
            // Return primary organization ID if exists
            if (user.getPrimaryOrganization() != null) {
                return Optional.of(user.getPrimaryOrganization().getId());
            }

            return Optional.empty();

        } catch (Exception e) {
            log.debug("Could not extract organization ID from request", e);
            return Optional.empty();
        }
    }

    /**
     * Calculate request size in bytes
     * Estimates from Content-Length header
     */
    private long calculateRequestSize(HttpServletRequest request) {
        try {
            String contentLength = request.getHeader("Content-Length");
            if (contentLength != null && !contentLength.isEmpty()) {
                try {
                    return Long.parseLong(contentLength);
                } catch (NumberFormatException e) {
                    // Ignore invalid content-length
                }
            }
            
            // Estimate based on method and path
            String method = request.getMethod();
            if ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method)) {
                // Estimate 2KB for POST/PUT/PATCH requests without content-length
                return 2048;
            }
            
            return 0;
        } catch (Exception e) {
            log.debug("Error calculating request size", e);
            return 0;
        }
    }

    /**
     * Calculate response size in bytes
     * Estimates from Content-Length header
     */
    private long calculateResponseSize(HttpServletResponse response) {
        try {
            String contentLength = response.getHeader("Content-Length");
            if (contentLength != null && !contentLength.isEmpty()) {
                try {
                    return Long.parseLong(contentLength);
                } catch (NumberFormatException e) {
                    // Ignore invalid content-length
                }
            }
            
            // Estimate based on status code
            int status = response.getStatus();
            if (status >= 200 && status < 300) {
                // Successful responses: estimate 5KB average
                return 5120;
            }
            
            return 0;
        } catch (Exception e) {
            log.debug("Error calculating response size", e);
            return 0;
        }
    }

    /**
     * Determine if request should be skipped for metrics tracking
     */
    private boolean shouldSkipTracking(String requestPath) {
        // Skip actuator endpoints
        if (requestPath.startsWith("/actuator")) {
            return true;
        }
        
        // Skip health checks
        if (requestPath.equals("/health") || requestPath.equals("/actuator/health")) {
            return true;
        }
        
        // Skip metrics endpoints themselves (to avoid recursion)
        if (requestPath.contains("/metrics")) {
            return true;
        }
        
        // Skip WebSocket endpoints
        if (requestPath.startsWith("/ws")) {
            return true;
        }
        
        return false;
    }
}

