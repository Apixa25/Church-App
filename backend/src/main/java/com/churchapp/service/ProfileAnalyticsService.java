package com.churchapp.service;

import com.churchapp.entity.ProfileView;
import com.churchapp.repository.ProfileViewRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileAnalyticsService {

    private final ProfileViewRepository profileViewRepository;
    private final UserRepository userRepository;

    /**
     * Record a profile view
     * Only records one view per viewer per day to prevent spam
     */
    @Transactional
    public void recordProfileView(UUID viewerId, UUID viewedUserId) {
        // Don't record self-views
        if (viewerId.equals(viewedUserId)) {
            return;
        }

        // Verify both users exist
        if (!userRepository.existsById(viewerId) || !userRepository.existsById(viewedUserId)) {
            log.warn("Attempted to record profile view with invalid user IDs: viewer={}, viewed={}", viewerId, viewedUserId);
            return;
        }

        // Check if already viewed today
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfNextDay = today.plusDays(1).atStartOfDay();
        
        if (profileViewRepository.hasViewedToday(viewerId, viewedUserId, startOfDay, startOfNextDay)) {
            log.debug("Profile view already recorded today for viewer {} viewing {}", viewerId, viewedUserId);
            return;
        }

        // Create new profile view
        ProfileView profileView = new ProfileView();
        profileView.setViewerId(viewerId);
        profileView.setViewedUserId(viewedUserId);
        profileView.setIsAnonymous(false);

        profileViewRepository.save(profileView);
        log.debug("Recorded profile view: {} viewed {}", viewerId, viewedUserId);
    }

    /**
     * Get profile views for a user (only visible to the profile owner)
     */
    public Page<ProfileView> getProfileViews(UUID userId, Pageable pageable) {
        return profileViewRepository.findByViewedUserIdOrderByViewedAtDesc(userId, pageable);
    }

    /**
     * Get recent profile views (last N days)
     */
    public List<ProfileView> getRecentProfileViews(UUID userId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return profileViewRepository.findRecentProfileViews(userId, since);
    }

    /**
     * Get total profile view count
     */
    public long getTotalProfileViews(UUID userId) {
        return profileViewRepository.countByViewedUserId(userId);
    }

    /**
     * Get profile views in a time period
     */
    public long getProfileViewsInPeriod(UUID userId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return profileViewRepository.countByViewedUserIdAndViewedAtAfter(userId, since);
    }

    /**
     * Get unique viewers count
     */
    public long getUniqueViewersCount(UUID userId) {
        return profileViewRepository.countUniqueViewers(userId);
    }

    /**
     * Get unique viewers in a time period
     */
    public long getUniqueViewersInPeriod(UUID userId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return profileViewRepository.countUniqueViewersSince(userId, since);
    }
}

