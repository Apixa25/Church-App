package com.churchapp.repository;

import com.churchapp.entity.FollowerSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowerSnapshotRepository extends JpaRepository<FollowerSnapshot, UUID> {

    // Get all snapshots for a user, ordered by date
    List<FollowerSnapshot> findByUserIdOrderBySnapshotDateDesc(UUID userId);

    // Get snapshots in a date range
    @Query("SELECT fs FROM FollowerSnapshot fs WHERE fs.userId = :userId AND fs.snapshotDate >= :startDate AND fs.snapshotDate <= :endDate ORDER BY fs.snapshotDate ASC")
    List<FollowerSnapshot> findByUserIdAndDateRange(@Param("userId") UUID userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Get latest snapshot for a user
    Optional<FollowerSnapshot> findFirstByUserIdOrderBySnapshotDateDesc(UUID userId);

    // Get snapshot for a specific date
    Optional<FollowerSnapshot> findByUserIdAndSnapshotDate(UUID userId, LocalDate snapshotDate);

    // Check if snapshot exists for today
    @Query("SELECT COUNT(fs) > 0 FROM FollowerSnapshot fs WHERE fs.userId = :userId AND fs.snapshotDate = CURRENT_DATE")
    boolean existsSnapshotForToday(@Param("userId") UUID userId);

    // Get growth rate (difference between latest and oldest in range)
    @Query("SELECT " +
           "MAX(fs.followerCount) - MIN(fs.followerCount) as growth " +
           "FROM FollowerSnapshot fs " +
           "WHERE fs.userId = :userId AND fs.snapshotDate >= :startDate AND fs.snapshotDate <= :endDate")
    Long calculateGrowthInRange(@Param("userId") UUID userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}

