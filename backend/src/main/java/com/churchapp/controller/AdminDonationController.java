package com.churchapp.controller;

import com.churchapp.dto.DonationAnalyticsResponse;
import com.churchapp.dto.TopDonorResponse;
import com.churchapp.service.DonationAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/admin/donations")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('PLATFORM_ADMIN') or hasRole('MODERATOR')")
public class AdminDonationController {

    private final DonationAnalyticsService donationAnalyticsService;

    /**
     * Get comprehensive donation analytics for admin dashboard
     */
    @GetMapping("/analytics")
    public ResponseEntity<DonationAnalyticsResponse> getDonationAnalytics(
            @RequestParam(defaultValue = "30d") String dateRange,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        try {
            log.info("Fetching donation analytics for date range: {}", dateRange);

            DonationAnalyticsResponse analytics = donationAnalyticsService.getAnalytics(
                dateRange, startDate, endDate);

            return ResponseEntity.ok(analytics);

        } catch (Exception e) {
            log.error("Error fetching donation analytics: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch donation analytics", e);
        }
    }

    /**
     * Get top donors with pagination and sorting
     */
    @GetMapping("/donors")
    public ResponseEntity<Page<TopDonorResponse>> getTopDonors(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "totalAmount") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {

        try {
            log.info("Fetching top donors: page={}, size={}, sortBy={}, direction={}",
                page, size, sortBy, sortDirection);

            Sort.Direction direction = sortDirection.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC;

            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
            Page<TopDonorResponse> donors = donationAnalyticsService.getTopDonors(pageable);

            return ResponseEntity.ok(donors);

        } catch (Exception e) {
            log.error("Error fetching top donors: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch top donors", e);
        }
    }

    /**
     * Export donation data as CSV or Excel
     */
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportDonations(
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(defaultValue = "30d") String dateRange,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        try {
            log.info("Exporting donations: format={}, dateRange={}", format, dateRange);

            byte[] exportData = donationAnalyticsService.exportDonations(
                format, dateRange, startDate, endDate);

            String filename = String.format("donations_%s_%s.%s",
                dateRange,
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm")),
                format);

            MediaType mediaType = format.equals("xlsx") ?
                MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") :
                MediaType.parseMediaType("text/csv");

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(mediaType)
                .body(exportData);

        } catch (Exception e) {
            log.error("Error exporting donations: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to export donations", e);
        }
    }

    /**
     * Get donation trends over time
     */
    @GetMapping("/trends")
    public ResponseEntity<DonationAnalyticsResponse> getDonationTrends(
            @RequestParam(defaultValue = "12m") String period,
            @RequestParam(required = false) String groupBy) {

        try {
            log.info("Fetching donation trends: period={}, groupBy={}", period, groupBy);

            DonationAnalyticsResponse trends = donationAnalyticsService.getTrends(period, groupBy);

            return ResponseEntity.ok(trends);

        } catch (Exception e) {
            log.error("Error fetching donation trends: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch donation trends", e);
        }
    }

    /**
     * Get donation summary for specific date range
     */
    @GetMapping("/summary")
    public ResponseEntity<DonationAnalyticsResponse> getDonationSummary(
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String category) {

        try {
            log.info("Fetching donation summary: {} to {}, category={}",
                startDate, endDate, category);

            DonationAnalyticsResponse summary = donationAnalyticsService.getSummary(
                startDate, endDate, category);

            return ResponseEntity.ok(summary);

        } catch (Exception e) {
            log.error("Error fetching donation summary: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch donation summary", e);
        }
    }
}