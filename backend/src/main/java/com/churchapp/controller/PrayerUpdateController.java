package com.churchapp.controller;

import com.churchapp.dto.PrayerUpdateRequest;
import com.churchapp.dto.PrayerUpdateResponse;
import com.churchapp.dto.UserProfileResponse;
import com.churchapp.exception.PrayerException;
import com.churchapp.service.PrayerUpdateService;
import com.churchapp.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Timeline updates on a prayer request ("here's how it went").
 * Read by the prayer's church; written and removed by the owner only.
 */
@RestController
@RequestMapping("/prayers/{prayerRequestId}/updates")
@RequiredArgsConstructor
@Slf4j
public class PrayerUpdateController {

    private final PrayerUpdateService prayerUpdateService;
    private final UserProfileService userProfileService;

    @GetMapping
    public ResponseEntity<?> getUpdates(@AuthenticationPrincipal User user,
                                        @PathVariable UUID prayerRequestId) {
        try {
            List<PrayerUpdateResponse> updates = prayerUpdateService.getUpdates(prayerRequestId, viewerId(user));
            return ResponseEntity.ok(updates);
        } catch (RuntimeException e) {
            return errorResponse(e);
        }
    }

    @PostMapping
    public ResponseEntity<?> addUpdate(@AuthenticationPrincipal User user,
                                       @PathVariable UUID prayerRequestId,
                                       @Valid @RequestBody PrayerUpdateRequest request) {
        try {
            PrayerUpdateResponse update = prayerUpdateService.addUpdate(prayerRequestId, viewerId(user), request);
            return ResponseEntity.status(HttpStatus.CREATED).body(update);
        } catch (RuntimeException e) {
            return errorResponse(e);
        }
    }

    @DeleteMapping("/{updateId}")
    public ResponseEntity<?> deleteUpdate(@AuthenticationPrincipal User user,
                                          @PathVariable UUID prayerRequestId,
                                          @PathVariable UUID updateId) {
        try {
            prayerUpdateService.deleteUpdate(prayerRequestId, updateId, viewerId(user));
            return ResponseEntity.ok(Map.of("message", "Update removed"));
        } catch (RuntimeException e) {
            return errorResponse(e);
        }
    }

    private UUID viewerId(User user) {
        UserProfileResponse currentProfile = userProfileService.getUserProfileByEmail(user.getUsername());
        return currentProfile.getUserId();
    }

    private ResponseEntity<Map<String, String>> errorResponse(RuntimeException e) {
        HttpStatus status = e instanceof PrayerException
            ? ((PrayerException) e).getStatus()
            : HttpStatus.BAD_REQUEST;
        if (status.is4xxClientError()) {
            log.debug("Prayer update rejected ({}): {}", status.value(), e.getMessage());
        } else {
            log.error("Prayer update failed ({}): {}", status.value(), e.getMessage(), e);
        }
        Map<String, String> error = new HashMap<>();
        error.put("error", e.getMessage());
        return ResponseEntity.status(status).body(error);
    }
}
