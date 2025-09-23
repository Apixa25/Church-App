package com.churchapp.service;

import com.churchapp.entity.User;
import com.churchapp.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDataExportService {

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final MessageRepository messageRepository;
    private final DonationRepository donationRepository;
    private final ObjectMapper objectMapper;

    public byte[] exportUserData(UUID userId, String format) {
        try {
            Map<String, Object> userData = collectUserData(userId);

            switch (format.toLowerCase()) {
                case "json":
                    return objectMapper.writeValueAsBytes(userData);
                case "pdf":
                    return generatePdfReport(userData);
                default:
                    throw new IllegalArgumentException("Unsupported export format: " + format);
            }
        } catch (Exception e) {
            log.error("Error exporting user data for user: {}", userId, e);
            throw new RuntimeException("Failed to export user data", e);
        }
    }

    private Map<String, Object> collectUserData(UUID userId) {
        Map<String, Object> userData = new HashMap<>();

        // User profile
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("createdAt", user.getCreatedAt());
        profile.put("lastLogin", user.getLastLogin());
        userData.put("profile", profile);

        // Settings
        userSettingsRepository.findByUserId(userId)
            .ifPresent(settings -> userData.put("settings", settings));

        // Prayer requests
        userData.put("prayerRequests", prayerRequestRepository.findByUserIdOrderByCreatedAtDesc(userId));

        // Messages (non-sensitive data only)
        userData.put("messageCount", messageRepository.countByUserId(userId));

        // Donations (if user has opted to include)
        userSettingsRepository.findByUserId(userId)
            .ifPresent(settings -> {
                if (settings.isShowDonationHistory()) {
                    userData.put("donations", donationRepository.findByUserIdOrderByTimestampDesc(userId));
                }
            });

        userData.put("exportDate", java.time.LocalDateTime.now());
        userData.put("exportFormat", "GDPR_COMPLIANT");

        return userData;
    }

    private byte[] generatePdfReport(Map<String, Object> userData) {
        // TODO: Implement PDF generation using a library like iText or similar
        // For now, return JSON as bytes
        try {
            return objectMapper.writeValueAsBytes(userData);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }
}