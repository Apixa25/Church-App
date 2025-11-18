package com.churchapp.repository;

import com.churchapp.entity.UserSettings;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSettingsRepository extends JpaRepository<UserSettings, UUID> {

    @EntityGraph(attributePaths = {"user"})
    Optional<UserSettings> findByUserId(UUID userId);

    @Query("SELECT us FROM UserSettings us WHERE us.pushNotifications = true AND us.fcmToken IS NOT NULL")
    List<UserSettings> findUsersWithPushNotificationsEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.emailNotifications = true")
    List<UserSettings> findUsersWithEmailNotificationsEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.prayerNotifications = true")
    List<UserSettings> findUsersWithPrayerNotificationsEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.announcementNotifications = true")
    List<UserSettings> findUsersWithAnnouncementNotificationsEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.eventNotifications = true")
    List<UserSettings> findUsersWithEventNotificationsEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.chatNotifications = true")
    List<UserSettings> findUsersWithChatNotificationsEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.weeklyDigest = true")
    List<UserSettings> findUsersWithWeeklyDigestEnabled();

    @Query("SELECT us FROM UserSettings us WHERE us.donationReminders = true")
    List<UserSettings> findUsersWithDonationRemindersEnabled();

    @Modifying
    @Query("UPDATE UserSettings us SET us.fcmToken = :token WHERE us.userId = :userId")
    void updateFcmToken(@Param("userId") UUID userId, @Param("token") String token);

    @Modifying
    @Query("UPDATE UserSettings us SET us.lastBackupDate = :backupDate WHERE us.userId = :userId")
    void updateLastBackupDate(@Param("userId") UUID userId, @Param("backupDate") LocalDateTime backupDate);

    @Query("SELECT COUNT(us) FROM UserSettings us WHERE us.theme = :theme")
    Long countByTheme(@Param("theme") UserSettings.Theme theme);

    @Query("SELECT COUNT(us) FROM UserSettings us WHERE us.language = :language")
    Long countByLanguage(@Param("language") String language);

    @Query("SELECT us.language, COUNT(us) FROM UserSettings us GROUP BY us.language")
    List<Object[]> getLanguageStatistics();

    @Query("SELECT us.theme, COUNT(us) FROM UserSettings us GROUP BY us.theme")
    List<Object[]> getThemeStatistics();

    @Query("SELECT us FROM UserSettings us WHERE us.autoBackupEnabled = true AND (us.lastBackupDate IS NULL OR us.lastBackupDate < :cutoffDate)")
    List<UserSettings> findUsersNeedingBackup(@Param("cutoffDate") LocalDateTime cutoffDate);
}