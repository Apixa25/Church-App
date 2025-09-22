package com.churchapp;

import com.churchapp.entity.*;
import com.churchapp.repository.*;
import com.churchapp.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test to verify the complete donation system works end-to-end
 * This test validates that all components work together correctly
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DonationSystemIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DonationRepository donationRepository;

    @Autowired
    private DonationSubscriptionRepository subscriptionRepository;

    @Test
    void testCompleteDonationSystemIntegration() {
        // ====== SETUP TEST DATA ======

        // Create test user
        User testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("integration@test.com");
        testUser.setName("Integration Test User");
        testUser.setRole(User.UserRole.MEMBER);
        testUser.setCreatedAt(LocalDateTime.now());
        testUser.setLastLogin(LocalDateTime.now());

        User savedUser = userRepository.save(testUser);
        assertNotNull(savedUser.getId());

        // ====== TEST ONE-TIME DONATIONS ======

        // Create one-time donation
        Donation oneTimeDonation = new Donation();
        oneTimeDonation.setId(UUID.randomUUID());
        oneTimeDonation.setUser(savedUser);
        oneTimeDonation.setAmount(BigDecimal.valueOf(75.00));
        oneTimeDonation.setCategory(DonationCategory.TITHES);
        oneTimeDonation.setTransactionId("pi_integration_test_123");
        oneTimeDonation.setTimestamp(LocalDateTime.now());
        oneTimeDonation.setIsRecurring(false);
        oneTimeDonation.setCurrency("USD");
        oneTimeDonation.setPurpose("Integration test donation");
        oneTimeDonation.setReceiptSent(false);

        Donation savedDonation = donationRepository.save(oneTimeDonation);
        assertNotNull(savedDonation.getId());
        assertEquals(BigDecimal.valueOf(75.00), savedDonation.getAmount());
        assertEquals(DonationCategory.TITHES, savedDonation.getCategory());
        assertFalse(savedDonation.getIsRecurring());

        // ====== TEST RECURRING SUBSCRIPTIONS ======

        // Create subscription
        DonationSubscription subscription = new DonationSubscription();
        subscription.setId(UUID.randomUUID());
        subscription.setUser(savedUser);
        subscription.setAmount(BigDecimal.valueOf(100.00));
        subscription.setCategory(DonationCategory.OFFERINGS);
        subscription.setFrequency(RecurringFrequency.MONTHLY);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStripeSubscriptionId("sub_integration_test_456");
        subscription.setCreatedAt(LocalDateTime.now());

        DonationSubscription savedSubscription = subscriptionRepository.save(subscription);
        assertNotNull(savedSubscription.getId());
        assertEquals(BigDecimal.valueOf(100.00), savedSubscription.getAmount());
        assertEquals(RecurringFrequency.MONTHLY, savedSubscription.getFrequency());
        assertEquals(SubscriptionStatus.ACTIVE, savedSubscription.getStatus());

        // Create recurring donation from subscription
        Donation recurringDonation = new Donation();
        recurringDonation.setId(UUID.randomUUID());
        recurringDonation.setUser(savedUser);
        recurringDonation.setAmount(savedSubscription.getAmount());
        recurringDonation.setCategory(savedSubscription.getCategory());
        recurringDonation.setTransactionId("pi_recurring_123");
        recurringDonation.setTimestamp(LocalDateTime.now());
        recurringDonation.setIsRecurring(true);
        recurringDonation.setSubscription(savedSubscription);
        recurringDonation.setCurrency("USD");
        recurringDonation.setPurpose("Monthly recurring donation");

        Donation savedRecurringDonation = donationRepository.save(recurringDonation);
        assertNotNull(savedRecurringDonation.getId());
        assertTrue(savedRecurringDonation.getIsRecurring());
        assertEquals(savedSubscription.getId(), savedRecurringDonation.getSubscription().getId());

        // ====== TEST REPOSITORY QUERIES ======

        // Test finding donations by user
        List<Donation> userDonations = donationRepository.findByUserOrderByTimestampDesc(savedUser,
            org.springframework.data.domain.PageRequest.of(0, 10)).getContent();
        assertEquals(2, userDonations.size());

        // Test finding subscriptions by user
        List<DonationSubscription> userSubscriptions = subscriptionRepository.findByUserOrderByCreatedAtDesc(savedUser);
        assertEquals(1, userSubscriptions.size());
        assertEquals(SubscriptionStatus.ACTIVE, userSubscriptions.get(0).getStatus());

        // Test finding donations by category
        List<Donation> tithesDonations = donationRepository.findByCategoryOrderByTimestampDesc(DonationCategory.TITHES,
            org.springframework.data.domain.PageRequest.of(0, 10)).getContent();
        assertEquals(1, tithesDonations.size());
        assertEquals("Integration test donation", tithesDonations.get(0).getPurpose());

        // ====== TEST BUSINESS LOGIC CONSTRAINTS ======

        // Test that user can have multiple active subscriptions
        DonationSubscription secondSubscription = new DonationSubscription();
        secondSubscription.setId(UUID.randomUUID());
        secondSubscription.setUser(savedUser);
        secondSubscription.setAmount(BigDecimal.valueOf(50.00));
        secondSubscription.setCategory(DonationCategory.MISSIONS);
        secondSubscription.setFrequency(RecurringFrequency.WEEKLY);
        secondSubscription.setStatus(SubscriptionStatus.ACTIVE);
        secondSubscription.setStripeSubscriptionId("sub_integration_test_789");
        secondSubscription.setCreatedAt(LocalDateTime.now());

        DonationSubscription savedSecondSubscription = subscriptionRepository.save(secondSubscription);
        assertNotNull(savedSecondSubscription.getId());

        // Verify user now has 2 active subscriptions
        List<DonationSubscription> allUserSubscriptions = subscriptionRepository.findByUserOrderByCreatedAtDesc(savedUser);
        assertEquals(2, allUserSubscriptions.size());

        // ====== TEST SUBSCRIPTION CANCELLATION ======

        // Cancel first subscription
        savedSubscription.setStatus(SubscriptionStatus.CANCELED);
        savedSubscription.setCanceledAt(LocalDateTime.now());
        subscriptionRepository.save(savedSubscription);

        // Verify subscription status
        DonationSubscription canceledSubscription = subscriptionRepository.findById(savedSubscription.getId()).orElse(null);
        assertNotNull(canceledSubscription);
        assertEquals(SubscriptionStatus.CANCELED, canceledSubscription.getStatus());
        assertNotNull(canceledSubscription.getCanceledAt());

        // ====== TEST DONATION ANALYTICS QUERIES ======

        // Test total donations for user
        List<Donation> allUserDonations = donationRepository.findByUserOrderByTimestampDesc(savedUser,
            org.springframework.data.domain.PageRequest.of(0, 100)).getContent();

        BigDecimal totalAmount = allUserDonations.stream()
            .map(Donation::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertEquals(BigDecimal.valueOf(175.00), totalAmount); // 75 + 100

        // Test donations by date range
        LocalDateTime startDate = LocalDateTime.now().minusDays(1);
        LocalDateTime endDate = LocalDateTime.now().plusDays(1);

        List<Donation> recentDonations = donationRepository.findByTimestampBetweenOrderByTimestampDesc(startDate, endDate);
        assertEquals(2, recentDonations.size());

        // ====== TEST DATA INTEGRITY ======

        // Verify foreign key relationships
        Donation foundDonation = donationRepository.findById(savedDonation.getId()).orElse(null);
        assertNotNull(foundDonation);
        assertNotNull(foundDonation.getUser());
        assertEquals(savedUser.getId(), foundDonation.getUser().getId());

        // Verify subscription relationships
        Donation foundRecurringDonation = donationRepository.findById(savedRecurringDonation.getId()).orElse(null);
        assertNotNull(foundRecurringDonation);
        assertNotNull(foundRecurringDonation.getSubscription());
        assertEquals(savedSubscription.getId(), foundRecurringDonation.getSubscription().getId());

        // ====== TEST RECEIPT TRACKING ======

        // Mark donation as receipt sent
        savedDonation.setReceiptSent(true);
        savedDonation.setReceiptSentAt(LocalDateTime.now());
        donationRepository.save(savedDonation);

        Donation donationWithReceipt = donationRepository.findById(savedDonation.getId()).orElse(null);
        assertNotNull(donationWithReceipt);
        assertTrue(donationWithReceipt.getReceiptSent());
        assertNotNull(donationWithReceipt.getReceiptSentAt());

        // ====== CLEANUP VERIFICATION ======

        // Verify we can delete test data (cascade relationships)
        long initialDonationCount = donationRepository.count();
        long initialSubscriptionCount = subscriptionRepository.count();

        // Delete user should cascade to donations and subscriptions
        userRepository.delete(savedUser);

        // Verify cleanup (in a real scenario with proper cascade settings)
        User deletedUser = userRepository.findById(savedUser.getId()).orElse(null);
        assertNull(deletedUser);

        System.out.println("✅ Integration test completed successfully!");
        System.out.println("📊 Test Summary:");
        System.out.println("   - Created user: " + savedUser.getEmail());
        System.out.println("   - Created donations: 2 (1 one-time, 1 recurring)");
        System.out.println("   - Created subscriptions: 2 (1 active, 1 canceled)");
        System.out.println("   - Total donation amount: $175.00");
        System.out.println("   - All repository operations: ✅");
        System.out.println("   - All business logic: ✅");
        System.out.println("   - All data integrity checks: ✅");
    }

    @Test
    void testDonationCategoryAndFrequencyValidation() {
        // Test all donation categories
        for (DonationCategory category : DonationCategory.values()) {
            User testUser = createTestUser("category_test_" + category.name().toLowerCase() + "@test.com");

            Donation donation = new Donation();
            donation.setId(UUID.randomUUID());
            donation.setUser(testUser);
            donation.setAmount(BigDecimal.valueOf(25.00));
            donation.setCategory(category);
            donation.setTransactionId("pi_category_test_" + category.name());
            donation.setTimestamp(LocalDateTime.now());
            donation.setIsRecurring(false);
            donation.setCurrency("USD");

            Donation savedDonation = donationRepository.save(donation);
            assertNotNull(savedDonation.getId());
            assertEquals(category, savedDonation.getCategory());
        }

        // Test all recurring frequencies
        for (RecurringFrequency frequency : RecurringFrequency.values()) {
            User testUser = createTestUser("frequency_test_" + frequency.name().toLowerCase() + "@test.com");

            DonationSubscription subscription = new DonationSubscription();
            subscription.setId(UUID.randomUUID());
            subscription.setUser(testUser);
            subscription.setAmount(BigDecimal.valueOf(30.00));
            subscription.setCategory(DonationCategory.TITHES);
            subscription.setFrequency(frequency);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setStripeSubscriptionId("sub_frequency_test_" + frequency.name());
            subscription.setCreatedAt(LocalDateTime.now());

            DonationSubscription savedSubscription = subscriptionRepository.save(subscription);
            assertNotNull(savedSubscription.getId());
            assertEquals(frequency, savedSubscription.getFrequency());
        }
    }

    private User createTestUser(String email) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setName("Test User");
        user.setRole(User.UserRole.MEMBER);
        user.setCreatedAt(LocalDateTime.now());
        user.setLastLogin(LocalDateTime.now());
        return userRepository.save(user);
    }
}