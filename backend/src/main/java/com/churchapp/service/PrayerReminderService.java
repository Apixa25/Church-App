package com.churchapp.service;

import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.UserSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Gentle daily nudge for members who tapped "I prayed": "You're praying for
 * 3 requests in your church — take a moment today."
 *
 * Only prayers that are still ACTIVE, in the member's own church, and prayed
 * for within the look-back window count. Members who turned off push or
 * prayer notifications are skipped, exactly as for other prayer pushes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PrayerReminderService {

    static final String REMINDER_TITLE = "Prayer Reminder";
    static final int LOOKBACK_DAYS = 30;

    private final PrayerInteractionRepository prayerInteractionRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final NotificationService notificationService;

    /** @return number of members reminded */
    @Transactional(readOnly = true)
    public int sendDailyReminders() {
        LocalDateTime since = LocalDateTime.now().minusDays(LOOKBACK_DAYS);
        List<Object[]> rows = prayerInteractionRepository.findCommittedPrayerCountsSince(since);
        if (rows.isEmpty()) {
            log.debug("Prayer reminders: nobody to remind");
            return 0;
        }

        Map<UUID, String> tokenByUser = new HashMap<>();
        Map<UUID, Long> countByUser = new HashMap<>();
        for (Object[] row : rows) {
            UUID userId = (UUID) row[0];
            String token = (String) row[1];
            long count = ((Number) row[2]).longValue();
            if (token == null || token.trim().isEmpty() || count == 0) {
                continue;
            }
            tokenByUser.put(userId, token.trim());
            countByUser.put(userId, count);
        }

        Set<UUID> optedOut = userSettingsRepository.findUserIdsOptedOutOfPrayerPush(tokenByUser.keySet());

        // One multicast per distinct count keeps the body personal ("3 requests")
        // without a send per user.
        Map<Long, List<String>> tokensByCount = new HashMap<>();
        for (Map.Entry<UUID, String> entry : tokenByUser.entrySet()) {
            if (optedOut.contains(entry.getKey())) {
                continue;
            }
            tokensByCount.computeIfAbsent(countByUser.get(entry.getKey()), k -> new ArrayList<>())
                .add(entry.getValue());
        }

        int reminded = 0;
        for (Map.Entry<Long, List<String>> entry : tokensByCount.entrySet()) {
            Map<String, String> data = new HashMap<>();
            data.put("type", "prayer_reminder");
            data.put("url", "/prayers");
            try {
                notificationService.sendBulkNotification(entry.getValue(), REMINDER_TITLE, reminderBody(entry.getKey()), data);
                reminded += entry.getValue().size();
            } catch (Exception e) {
                log.error("Prayer reminders: failed to send batch for count {}: {}", entry.getKey(), e.getMessage());
            }
        }

        log.info("Prayer reminders: reminded {} member(s) ({} skipped by settings)", reminded, optedOut.size());
        return reminded;
    }

    public static String reminderBody(long count) {
        if (count == 1) {
            return "You're praying for 1 request in your church. Take a moment with it today.";
        }
        return "You're praying for " + count + " requests in your church. Take a moment with them today.";
    }
}
