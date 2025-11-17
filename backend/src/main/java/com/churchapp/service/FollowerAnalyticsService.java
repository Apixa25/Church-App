package com.churchapp.service;

import com.churchapp.entity.FollowerSnapshot;
import com.churchapp.repository.FollowerSnapshotRepository;
import com.churchapp.service.UserFollowService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowerAnalyticsService {

    private final FollowerSnapshotRepository followerSnapshotRepository;
    private final UserFollowService userFollowService;

    /**
     * Create a snapshot of follower/following counts for a user
     * Called daily via scheduled job or manually
     */
    @Transactional
    public void createSnapshot(UUID userId) {
        // Check if snapshot already exists for today
        if (followerSnapshotRepository.existsSnapshotForToday(userId)) {
            log.debug("Snapshot already exists for user {} today", userId);
            return;
        }

        // Get current counts
        long followerCount = userFollowService.getFollowerCount(userId);
        long followingCount = userFollowService.getFollowingCount(userId);

        // Create snapshot
        FollowerSnapshot snapshot = new FollowerSnapshot();
        snapshot.setUserId(userId);
        snapshot.setFollowerCount((int) followerCount);
        snapshot.setFollowingCount((int) followingCount);
        snapshot.setSnapshotDate(LocalDate.now());

        followerSnapshotRepository.save(snapshot);
        log.debug("Created follower snapshot for user {}: {} followers, {} following", userId, followerCount, followingCount);
    }

    /**
     * Get follower growth data for a user
     */
    public Map<String, Object> getFollowerGrowth(UUID userId, int days) {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(days);

        List<FollowerSnapshot> snapshots = followerSnapshotRepository.findByUserIdAndDateRange(userId, startDate, endDate);

        // Get latest snapshot for current counts
        FollowerSnapshot latest = followerSnapshotRepository.findFirstByUserIdOrderBySnapshotDateDesc(userId)
            .orElse(null);

        // Get oldest snapshot in range for comparison
        FollowerSnapshot oldest = snapshots.isEmpty() ? null : snapshots.get(snapshots.size() - 1);

        // Calculate growth
        int currentFollowers = latest != null ? latest.getFollowerCount() : 0;
        int previousFollowers = oldest != null ? oldest.getFollowerCount() : 0;
        int growth = currentFollowers - previousFollowers;
        double growthRate = previousFollowers > 0 ? ((double) growth / previousFollowers) * 100 : 0.0;

        // Build chart data
        List<Map<String, Object>> chartData = new ArrayList<>();
        for (FollowerSnapshot snapshot : snapshots) {
            Map<String, Object> point = new HashMap<>();
            point.put("date", snapshot.getSnapshotDate().toString());
            point.put("followers", snapshot.getFollowerCount());
            point.put("following", snapshot.getFollowingCount());
            chartData.add(point);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("currentFollowers", currentFollowers);
        result.put("currentFollowing", latest != null ? latest.getFollowingCount() : 0);
        result.put("growth", growth);
        result.put("growthRate", Math.round(growthRate * 100.0) / 100.0);
        result.put("period", days);
        result.put("chartData", chartData);
        result.put("snapshotCount", snapshots.size());

        return result;
    }

    /**
     * Get all snapshots for a user
     */
    public List<FollowerSnapshot> getSnapshots(UUID userId) {
        return followerSnapshotRepository.findByUserIdOrderBySnapshotDateDesc(userId);
    }

    /**
     * Get latest snapshot
     */
    public FollowerSnapshot getLatestSnapshot(UUID userId) {
        return followerSnapshotRepository.findFirstByUserIdOrderBySnapshotDateDesc(userId)
            .orElse(null);
    }

    /**
     * Scheduled job to create daily snapshots for all users
     * Runs at 2 AM daily
     */
    @Scheduled(cron = "0 0 2 * * ?") // 2 AM daily
    @Transactional
    public void createDailySnapshots() {
        log.info("Starting daily follower snapshot creation...");
        
        // This would need to get all active users
        // For now, we'll create snapshots on-demand when users view their analytics
        // You can enhance this later to batch process all users
        
        log.info("Daily follower snapshot job completed");
    }
}

