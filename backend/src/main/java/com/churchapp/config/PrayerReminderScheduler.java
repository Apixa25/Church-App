package com.churchapp.config;

import com.churchapp.service.PrayerReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily "I prayed" reminder push.
 *
 * Runs at 08:00 server time by default. Override with
 * {@code app.prayer-reminders.cron}; switch off with
 * {@code app.prayer-reminders.enabled=false}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.prayer-reminders.enabled", havingValue = "true", matchIfMissing = true)
public class PrayerReminderScheduler {

    private final PrayerReminderService prayerReminderService;

    @Scheduled(cron = "${app.prayer-reminders.cron:0 0 8 * * *}")
    public void sendDailyPrayerReminders() {
        try {
            int reminded = prayerReminderService.sendDailyReminders();
            log.info("Prayer reminder job finished: {} member(s) reminded", reminded);
        } catch (Exception e) {
            log.error("Prayer reminder job failed: {}", e.getMessage(), e);
        }
    }
}
