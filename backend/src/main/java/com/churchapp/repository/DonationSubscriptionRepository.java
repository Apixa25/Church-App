package com.churchapp.repository;

import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.DonationSubscription;
import com.churchapp.entity.SubscriptionStatus;
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
public interface DonationSubscriptionRepository extends JpaRepository<DonationSubscription, UUID> {

    // Find by user
    List<DonationSubscription> findByUserOrderByCreatedAtDesc(User user);
    Page<DonationSubscription> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    // Find by user and status
    List<DonationSubscription> findByUserAndStatusOrderByCreatedAtDesc(User user, SubscriptionStatus status);

    // Find active subscriptions for user
    List<DonationSubscription> findByUserAndStatusInOrderByCreatedAtDesc(User user, List<SubscriptionStatus> statuses);

    // Find by Stripe subscription ID
    Optional<DonationSubscription> findByStripeSubscriptionId(String stripeSubscriptionId);

    // Find by Stripe customer ID
    List<DonationSubscription> findByStripeCustomerIdOrderByCreatedAtDesc(String stripeCustomerId);

    // Find by status
    List<DonationSubscription> findByStatusOrderByCreatedAtDesc(SubscriptionStatus status);
    Page<DonationSubscription> findByStatusOrderByCreatedAtDesc(SubscriptionStatus status, Pageable pageable);

    // Find active subscriptions
    @Query("SELECT s FROM DonationSubscription s WHERE s.status = 'ACTIVE' ORDER BY s.createdAt DESC")
    List<DonationSubscription> findActiveSubscriptions();

    @Query("SELECT s FROM DonationSubscription s WHERE s.status = 'ACTIVE' ORDER BY s.createdAt DESC")
    Page<DonationSubscription> findActiveSubscriptions(Pageable pageable);

    // Find subscriptions by category
    List<DonationSubscription> findByCategoryOrderByCreatedAtDesc(DonationCategory category);
    Page<DonationSubscription> findByCategoryOrderByCreatedAtDesc(DonationCategory category, Pageable pageable);

    // Find subscriptions ending soon (for notifications)
    @Query("SELECT s FROM DonationSubscription s WHERE s.status = 'ACTIVE' AND s.currentPeriodEnd BETWEEN :startDate AND :endDate")
    List<DonationSubscription> findSubscriptionsEndingSoon(@Param("startDate") LocalDateTime startDate,
                                                          @Param("endDate") LocalDateTime endDate);

    // Find failed subscriptions
    @Query("SELECT s FROM DonationSubscription s WHERE s.status = 'PAST_DUE' OR s.failureCount > 0 ORDER BY s.lastFailureDate DESC")
    List<DonationSubscription> findFailedSubscriptions();

    // Analytics queries
    @Query("SELECT COUNT(s) FROM DonationSubscription s WHERE s.status = 'ACTIVE'")
    Long getActiveSubscriptionCount();

    @Query("SELECT SUM(s.amount) FROM DonationSubscription s WHERE s.status = 'ACTIVE'")
    BigDecimal getTotalActiveSubscriptionAmount();

    @Query("SELECT s.category, COUNT(s), SUM(s.amount) FROM DonationSubscription s WHERE s.status = 'ACTIVE' GROUP BY s.category")
    List<Object[]> getActiveSubscriptionsByCategory();

    @Query("SELECT s.frequency, COUNT(s), SUM(s.amount) FROM DonationSubscription s WHERE s.status = 'ACTIVE' GROUP BY s.frequency")
    List<Object[]> getActiveSubscriptionsByFrequency();

    // Monthly recurring revenue analytics
    @Query("SELECT FUNCTION('YEAR', s.createdAt), FUNCTION('MONTH', s.createdAt), COUNT(s), SUM(s.amount) " +
           "FROM DonationSubscription s WHERE s.createdAt BETWEEN :startDate AND :endDate " +
           "GROUP BY FUNCTION('YEAR', s.createdAt), FUNCTION('MONTH', s.createdAt) " +
           "ORDER BY FUNCTION('YEAR', s.createdAt), FUNCTION('MONTH', s.createdAt)")
    List<Object[]> getMonthlySubscriptionTrends(@Param("startDate") LocalDateTime startDate,
                                              @Param("endDate") LocalDateTime endDate);

    // Churn analysis
    @Query("SELECT COUNT(s) FROM DonationSubscription s WHERE s.status = 'CANCELED' AND s.canceledAt BETWEEN :startDate AND :endDate")
    Long getCanceledSubscriptionCount(@Param("startDate") LocalDateTime startDate,
                                    @Param("endDate") LocalDateTime endDate);

    // User subscription statistics
    @Query("SELECT COUNT(s), SUM(s.amount) FROM DonationSubscription s WHERE s.user = :user AND s.status = 'ACTIVE'")
    Object[] getUserActiveSubscriptionStats(@Param("user") User user);

    @Query("SELECT COUNT(s), SUM(CASE WHEN s.status = 'ACTIVE' THEN s.amount ELSE 0 END) " +
           "FROM DonationSubscription s WHERE s.user = :user")
    Object[] getUserAllSubscriptionStats(@Param("user") User user);

    // Find subscriptions needing payment retry
    @Query("SELECT s FROM DonationSubscription s WHERE s.status = 'PAST_DUE' AND s.failureCount < 3 ORDER BY s.lastFailureDate ASC")
    List<DonationSubscription> findSubscriptionsNeedingRetry();

    // Find subscriptions by date range
    @Query("SELECT s FROM DonationSubscription s WHERE s.createdAt BETWEEN :startDate AND :endDate ORDER BY s.createdAt DESC")
    List<DonationSubscription> findSubscriptionsByDateRange(@Param("startDate") LocalDateTime startDate,
                                                           @Param("endDate") LocalDateTime endDate);

    // Top recurring donors
    @Query("SELECT s.user, COUNT(s), SUM(s.amount) FROM DonationSubscription s " +
           "WHERE s.status = 'ACTIVE' " +
           "GROUP BY s.user ORDER BY SUM(s.amount) DESC")
    List<Object[]> getTopRecurringDonors(Pageable pageable);
}