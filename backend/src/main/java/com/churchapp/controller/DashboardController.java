package com.churchapp.controller;

import com.churchapp.dto.DashboardResponse;
import com.churchapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID organizationId) {
        try {
            DashboardResponse dashboard = dashboardService.getDashboardData(user.getUsername(), organizationId);
            return ResponseEntity.ok(dashboard);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/activity")
    public ResponseEntity<DashboardResponse> getActivityFeed(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID organizationId) {
        try {
            DashboardResponse dashboard = dashboardService.getDashboardData(user.getUsername(), organizationId);
            return ResponseEntity.ok(dashboard);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID organizationId) {
        try {
            DashboardResponse dashboard = dashboardService.getDashboardData(user.getUsername(), organizationId);
            Map<String, Object> response = new HashMap<>();
            response.put("stats", dashboard.getStats());
            response.put("lastUpdated", dashboard.getLastUpdated());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch dashboard stats");
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID organizationId) {
        try {
            DashboardResponse dashboard = dashboardService.getDashboardData(user.getUsername(), organizationId);
            Map<String, Object> response = new HashMap<>();
            response.put("notifications", dashboard.getNotifications());
            response.put("lastUpdated", dashboard.getLastUpdated());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch notifications");
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @GetMapping("/quick-actions")
    public ResponseEntity<?> getQuickActions(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID organizationId) {
        try {
            DashboardResponse dashboard = dashboardService.getDashboardData(user.getUsername(), organizationId);
            Map<String, Object> response = new HashMap<>();
            response.put("quickActions", dashboard.getQuickActions());
            response.put("lastUpdated", dashboard.getLastUpdated());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch quick actions");
            return ResponseEntity.badRequest().body(error);
        }
    }
}