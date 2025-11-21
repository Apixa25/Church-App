package com.churchapp.controller;

import com.churchapp.dto.MetricsDashboardResponse;
import com.churchapp.service.MetricsDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/metrics/dashboard")
@RequiredArgsConstructor
@Slf4j
public class MetricsDashboardController {

    private final MetricsDashboardService metricsDashboardService;

    @GetMapping
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<MetricsDashboardResponse> getDashboardMetrics(
            @RequestParam(name = "days", defaultValue = "30") int days
    ) {
        log.info("Admin requested metrics dashboard for last {} days", days);
        MetricsDashboardResponse response = metricsDashboardService.getDashboardMetrics(days);
        return ResponseEntity.ok(response);
    }
}

