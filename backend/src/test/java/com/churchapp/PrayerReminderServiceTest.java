package com.churchapp;

import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.UserSettingsRepository;
import com.churchapp.service.NotificationService;
import com.churchapp.service.PrayerReminderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Daily reminders go only to members who tapped "I prayed", still want prayer
 * pushes, and are grouped by count so each body reads naturally.
 */
@ExtendWith(MockitoExtension.class)
class PrayerReminderServiceTest {

    @Mock private PrayerInteractionRepository prayerInteractionRepository;
    @Mock private UserSettingsRepository userSettingsRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private PrayerReminderService service;

    @Test
    void nobodyToRemind_sendsNothing() {
        when(prayerInteractionRepository.findCommittedPrayerCountsSince(any())).thenReturn(List.of());

        assertEquals(0, service.sendDailyReminders());

        verify(notificationService, never()).sendBulkNotification(anyList(), anyString(), anyString(), anyMap());
        verify(userSettingsRepository, never()).findUserIdsOptedOutOfPrayerPush(anyCollection());
    }

    @Test
    void groupsByCount_skipsOptOuts_andTagsAsReminder() {
        UUID bob = UUID.randomUUID();     // 3 prayers
        UUID carol = UUID.randomUUID();   // 1 prayer, opted out
        UUID dave = UUID.randomUUID();    // 3 prayers
        UUID erin = UUID.randomUUID();    // 1 prayer
        when(prayerInteractionRepository.findCommittedPrayerCountsSince(any())).thenReturn(List.<Object[]>of(
            new Object[]{bob, "token-bob", 3L},
            new Object[]{carol, "token-carol", 1L},
            new Object[]{dave, "token-dave", 3L},
            new Object[]{erin, "token-erin", 1L}
        ));
        when(userSettingsRepository.findUserIdsOptedOutOfPrayerPush(anyCollection())).thenReturn(Set.of(carol));

        int reminded = service.sendDailyReminders();

        assertEquals(3, reminded);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> tokens = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<String> bodies = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> data = ArgumentCaptor.forClass(Map.class);
        verify(notificationService, times(2)).sendBulkNotification(tokens.capture(), eq("Prayer Reminder"), bodies.capture(), data.capture());

        Set<String> allTokens = new HashSet<>();
        tokens.getAllValues().forEach(allTokens::addAll);
        assertEquals(Set.of("token-bob", "token-dave", "token-erin"), allTokens, "Carol opted out");

        for (int i = 0; i < tokens.getAllValues().size(); i++) {
            List<String> batch = tokens.getAllValues().get(i);
            String body = bodies.getAllValues().get(i);
            if (batch.contains("token-erin")) {
                assertEquals(List.of("token-erin"), batch);
                assertTrue(body.contains("1 request in"), body);
            } else {
                assertEquals(Set.of("token-bob", "token-dave"), Set.copyOf(batch));
                assertTrue(body.contains("3 requests"), body);
            }
            assertEquals("prayer_reminder", data.getAllValues().get(i).get("type"));
        }
    }

    @Test
    void reminderBody_readsNaturallyForOneAndMany() {
        assertEquals("You're praying for 1 request in your church. Take a moment with it today.",
            PrayerReminderService.reminderBody(1));
        assertEquals("You're praying for 4 requests in your church. Take a moment with them today.",
            PrayerReminderService.reminderBody(4));
    }
}
