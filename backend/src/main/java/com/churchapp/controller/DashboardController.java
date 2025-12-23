package com.churchapp.controller;

import com.churchapp.dto.DashboardResponse;
import com.churchapp.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.churchapp.dto.DashboardResponse.QuickAction;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    
    private final DashboardService dashboardService;
    
    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal User user,
            @RequestParam(required = false) UUID organizationId) {
        try {
            System.out.println("🎯 DashboardController.getDashboard - Received organizationId: " + organizationId);
            System.out.println("🎯 DashboardController.getDashboard - User: " + user.getUsername());
            DashboardResponse dashboard = dashboardService.getDashboardData(user.getUsername(), organizationId);
            return ResponseEntity.ok(dashboard);
        } catch (RuntimeException e) {
            System.err.println("❌ DashboardController.getDashboard - Error: " + e.getMessage());
            e.printStackTrace();
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
            // 🚀 OPTIMIZED: Use dedicated method that only fetches quick actions
            // This is much faster than getDashboardData() which builds the entire dashboard
            List<QuickAction> quickActions = dashboardService.getQuickActionsOnly(user.getUsername(), organizationId);
            Map<String, Object> response = new HashMap<>();
            response.put("quickActions", quickActions);
            response.put("lastUpdated", LocalDateTime.now());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            System.err.println("❌ DashboardController.getQuickActions - Error: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch quick actions");
            return ResponseEntity.badRequest().body(error);
        }
    }
}