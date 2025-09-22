package com.churchapp.repository;

import com.churchapp.entity.Donation;
import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DonationRepository extends JpaRepository<Donation, UUID> {

    // Find by user
    List<Donation> findByUserOrderByTimestampDesc(User user);
    Page<Donation> findByUserOrderByTimestampDesc(User user, Pageable pageable);

    // Find by user and category
    List<Donation> findByUserAndCategoryOrderByTimestampDesc(User user, DonationCategory category);
    Page<Donation> findByUserAndCategoryOrderByTimestampDesc(User user, DonationCategory category, Pageable pageable);

    // Find by transaction ID
    Optional<Donation> findByTransactionId(String transactionId);

    // Find by Stripe payment intent ID
    Optional<Donation> findByStripePaymentIntentId(String stripePaymentIntentId);

    // Find donations in date range
    @Query("SELECT d FROM Donation d WHERE d.timestamp BETWEEN :startDate AND :endDate ORDER BY d.timestamp DESC")
    List<Donation> findDonationsByDateRange(@Param("startDate") LocalDateTime startDate,
                                           @Param("endDate") LocalDateTime endDate);

    @Query("SELECT d FROM Donation d WHERE d.user = :user AND d.timestamp BETWEEN :startDate AND :endDate ORDER BY d.timestamp DESC")
    List<Donation> findDonationsByUserAndDateRange(@Param("user") User user,
                                                   @Param("startDate") LocalDateTime startDate,
                                                   @Param("endDate") LocalDateTime endDate);

    // Find recent donations for dashboard
    @Query("SELECT d FROM Donation d ORDER BY d.timestamp DESC")
    Page<Donation> findRecentDonations(Pageable pageable);

    // Analytics queries
    @Query("SELECT SUM(d.amount) FROM Donation d WHERE d.timestamp BETWEEN :startDate AND :endDate")
    BigDecimal getTotalDonationsByDateRange(@Param("startDate") LocalDateTime startDate,
                                          @Param("endDate") LocalDateTime endDate);

    @Query("SELECT SUM(d.amount) FROM Donation d WHERE d.user = :user AND d.timestamp BETWEEN :startDate AND :endDate")
    BigDecimal getTotalDonationsByUserAndDateRange(@Param("user") User user,
                                                 @Param("startDate") LocalDateTime startDate,
                                                 @Param("endDate") LocalDateTime endDate);

    @Query("SELECT d.category, SUM(d.amount) FROM Donation d WHERE d.timestamp BETWEEN :startDate AND :endDate GROUP BY d.category")
    List<Object[]> getDonationsSummaryByCategory(@Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate);

    @Query("SELECT COUNT(DISTINCT d.user) FROM Donation d WHERE d.timestamp BETWEEN :startDate AND :endDate")
    Long getUniqueDonorCount(@Param("startDate") LocalDateTime startDate,
                           @Param("endDate") LocalDateTime endDate);

    // Monthly analytics
    @Query("SELECT FUNCTION('YEAR', d.timestamp), FUNCTION('MONTH', d.timestamp), SUM(d.amount) " +
           "FROM Donation d WHERE d.timestamp BETWEEN :startDate AND :endDate " +
           "GROUP BY FUNCTION('YEAR', d.timestamp), FUNCTION('MONTH', d.timestamp) " +
           "ORDER BY FUNCTION('YEAR', d.timestamp), FUNCTION('MONTH', d.timestamp)")
    List<Object[]> getMonthlyDonationTotals(@Param("startDate") LocalDateTime startDate,
                                          @Param("endDate") LocalDateTime endDate);

    // Find donations by category
    List<Donation> findByCategoryOrderByTimestampDesc(DonationCategory category);
    Page<Donation> findByCategoryOrderByTimestampDesc(DonationCategory category, Pageable pageable);

    // Find recurring donations
    List<Donation> findByIsRecurringTrueOrderByTimestampDesc();
    Page<Donation> findByIsRecurringTrueOrderByTimestampDesc(Pageable pageable);

    // Find donations without sent receipts
    List<Donation> findByReceiptSentFalseOrderByTimestampDesc();

    // Large donations (for admin review)
    @Query("SELECT d FROM Donation d WHERE d.amount >= :minimumAmount ORDER BY d.timestamp DESC")
    List<Donation> findLargeDonations(@Param("minimumAmount") BigDecimal minimumAmount);

    // Top donors (for admin analytics)
    @Query("SELECT d.user, SUM(d.amount), COUNT(d) FROM Donation d " +
           "WHERE d.timestamp BETWEEN :startDate AND :endDate " +
           "GROUP BY d.user ORDER BY SUM(d.amount) DESC")
    List<Object[]> getTopDonors(@Param("startDate") LocalDateTime startDate,
                              @Param("endDate") LocalDateTime endDate,
                              Pageable pageable);

    // User donation statistics
    @Query("SELECT COUNT(d), SUM(d.amount), MIN(d.timestamp), MAX(d.timestamp) " +
           "FROM Donation d WHERE d.user = :user")
    Object[] getUserDonationStats(@Param("user") User user);

    // Additional analytics methods
    List<Donation> findByTimestampBetween(LocalDateTime startDate, LocalDateTime endDate);

    List<Donation> findByTimestampBetweenAndCategory(LocalDateTime startDate, LocalDateTime endDate, DonationCategory category);

    @Query("SELECT d.user.id, d.user.name, SUM(d.amount), COUNT(d), MAX(d.timestamp), " +
           "CASE WHEN COUNT(CASE WHEN d.isRecurring = true THEN 1 END) > 0 THEN true ELSE false END " +
           "FROM Donation d GROUP BY d.user.id, d.user.name ORDER BY SUM(d.amount) DESC")
    List<Object[]> findDonorStatistics();
}