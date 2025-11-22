package com.churchapp.controller;

import com.churchapp.dto.MetricsDashboardResponse;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.AdminAuthorizationService;
import com.churchapp.service.MetricsDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/metrics/dashboard")
@RequiredArgsConstructor
@Slf4j
public class MetricsDashboardController {

    private final MetricsDashboardService metricsDashboardService;
    private final AdminAuthorizationService adminAuthService;
    private final UserRepository userRepository;

    @GetMapping
    @PreAuthorize("@adminAuthorizationService.hasAnyAdminAccess(authentication.principal)")
    public ResponseEntity<MetricsDashboardResponse> getDashboardMetrics(
            @RequestParam(name = "days", defaultValue = "30") int days,
            Authentication auth
    ) {
        try {
            // Get current user and their admin organization scope
            User currentUser = getCurrentUser(auth);
            List<UUID> orgIds = adminAuthService.getAdminOrganizationIds(currentUser);
            
            log.info("Admin requested metrics dashboard for last {} days, orgScope={}",
                days, orgIds == null ? "ALL (Platform Admin)" : orgIds.size() + " org(s)");

            MetricsDashboardResponse response = metricsDashboardService.getDashboardMetrics(days, orgIds);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching metrics dashboard: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch metrics dashboard", e);
        }
    }

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
}

