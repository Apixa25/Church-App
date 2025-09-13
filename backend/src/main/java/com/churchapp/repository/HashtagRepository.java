package com.churchapp.repository;

import com.churchapp.entity.Hashtag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
public interface HashtagRepository extends JpaRepository<Hashtag, UUID> {

    // Find hashtag by tag name
    Optional<Hashtag> findByTag(String tag);
    boolean existsByTag(String tag);

    // Find hashtags by usage count
    Page<Hashtag> findAllByOrderByUsageCountDesc(Pageable pageable);

    // Find trending hashtags (high usage in recent time)
    @Query("SELECT h FROM Hashtag h WHERE h.lastUsed >= :since ORDER BY h.usageCount DESC")
    Page<Hashtag> findTrendingHashtags(@Param("since") LocalDateTime since, Pageable pageable);

    // Search hashtags by partial tag name
    @Query("SELECT h FROM Hashtag h WHERE LOWER(h.tag) LIKE LOWER(CONCAT('%', :searchTerm, '%')) ORDER BY h.usageCount DESC")
    Page<Hashtag> findByTagContaining(@Param("searchTerm") String searchTerm, Pageable pageable);

    // Find hashtags created recently
    @Query("SELECT h FROM Hashtag h WHERE h.createdAt >= :since ORDER BY h.createdAt DESC")
    Page<Hashtag> findRecentHashtags(@Param("since") LocalDateTime since, Pageable pageable);

    // Find hashtags by minimum usage count
    @Query("SELECT h FROM Hashtag h WHERE h.usageCount >= :minUsage ORDER BY h.usageCount DESC")
    Page<Hashtag> findPopularHashtags(@Param("minUsage") Integer minUsage, Pageable pageable);

    // Count total hashtags
    long count();

    // Count hashtags with usage above threshold
    @Query("SELECT COUNT(h) FROM Hashtag h WHERE h.usageCount >= :minUsage")
    long countByUsageCountGreaterThanEqual(@Param("minUsage") Integer minUsage);

    // Update usage count for a hashtag
    @Modifying
    @Query("UPDATE Hashtag h SET h.usageCount = h.usageCount + 1, h.lastUsed = CURRENT_TIMESTAMP WHERE h.id = :hashtagId")
    void incrementUsageCount(@Param("hashtagId") UUID hashtagId);

    @Modifying
    @Query("UPDATE Hashtag h SET h.usageCount = h.usageCount - 1 WHERE h.id = :hashtagId AND h.usageCount > 0")
    void decrementUsageCount(@Param("hashtagId") UUID hashtagId);

    // Bulk operations for cleanup
    @Modifying
    @Query("DELETE FROM Hashtag h WHERE h.usageCount = 0 AND h.createdAt < :cutoffDate")
    void deleteUnusedHashtags(@Param("cutoffDate") LocalDateTime cutoffDate);

    @Modifying
    @Query("DELETE FROM Hashtag h WHERE h.lastUsed < :cutoffDate")
    void deleteStaleHashtags(@Param("cutoffDate") LocalDateTime cutoffDate);

    // Find top hashtags by usage
    @Query("SELECT h FROM Hashtag h ORDER BY h.usageCount DESC")
    List<Hashtag> findTopHashtags(Pageable pageable);

    // Find hashtags used in specific time range
    @Query("SELECT h FROM Hashtag h WHERE h.lastUsed BETWEEN :startDate AND :endDate ORDER BY h.usageCount DESC")
    List<Hashtag> findHashtagsUsedBetween(@Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);

    // Reset usage counts (for maintenance)
    @Modifying
    @Query("UPDATE Hashtag h SET h.usageCount = 0")
    void resetAllUsageCounts();
}
