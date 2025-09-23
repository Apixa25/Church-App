package com.churchapp;

import com.churchapp.controller.DonationController;
import com.churchapp.dto.SubscriptionRequest;
import com.churchapp.dto.SubscriptionResponse;
import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.DonationSubscription;
import com.churchapp.entity.RecurringFrequency;
import com.churchapp.entity.SubscriptionStatus;
import com.churchapp.entity.User;
import com.churchapp.repository.DonationSubscriptionRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.StripeSubscriptionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class DonationSubscriptionTest {

    @Mock
    private StripeSubscriptionService stripeSubscriptionService;

    @Mock
    private DonationSubscriptionRepository subscriptionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private DonationController donationController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private User testUser;
    private DonationSubscription testSubscription;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(donationController).build();
        objectMapper = new ObjectMapper();

        // Create test user
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@church.com");
        testUser.setName("Test User");
        testUser.setRole(User.Role.MEMBER);

        // Create test subscription
        testSubscription = new DonationSubscription();
        testSubscription.setId(UUID.randomUUID());
        testSubscription.setUser(testUser);
        testSubscription.setAmount(BigDecimal.valueOf(100.00));
        testSubscription.setCategory(DonationCategory.TITHES);
        testSubscription.setFrequency(RecurringFrequency.MONTHLY);
        testSubscription.setStatus(SubscriptionStatus.ACTIVE);
        testSubscription.setStripeSubscriptionId("sub_test123");
        testSubscription.setCreatedAt(LocalDateTime.now());

        // Mock authentication
        when(authentication.getName()).thenReturn(testUser.getEmail());
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
    }

    @Test
    void testCreateSubscription_Success() throws Exception {
        // Arrange
        SubscriptionRequest request = new SubscriptionRequest();
        request.setAmount(BigDecimal.valueOf(100.00));
        request.setCategory(DonationCategory.TITHES);
        request.setFrequency(RecurringFrequency.MONTHLY);
        request.setPurpose("Monthly tithe");
        request.setPaymentMethodId("pm_test123");

        when(stripeSubscriptionService.createSubscription(
            eq(testUser),
            eq(BigDecimal.valueOf(100.00)),
            eq(DonationCategory.TITHES),
            eq(RecurringFrequency.MONTHLY),
            eq("Monthly tithe"),
            eq("pm_test123")
        )).thenReturn(testSubscription);

        // Act & Assert
        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testSubscription.getId().toString()))
                .andExpect(jsonPath("$.amount").value(100.00))
                .andExpect(jsonPath("$.frequency").value("MONTHLY"))
                .andExpect(jsonPath("$.category").value("TITHES"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(stripeSubscriptionService).createSubscription(
            eq(testUser),
            eq(BigDecimal.valueOf(100.00)),
            eq(DonationCategory.TITHES),
            eq(RecurringFrequency.MONTHLY),
            eq("Monthly tithe"),
            eq("pm_test123")
        );
    }

    @Test
    void testCreateSubscription_InvalidAmount() throws Exception {
        // Arrange
        SubscriptionRequest request = new SubscriptionRequest();
        request.setAmount(BigDecimal.valueOf(0.50)); // Invalid amount
        request.setCategory(DonationCategory.TITHES);
        request.setFrequency(RecurringFrequency.MONTHLY);
        request.setPaymentMethodId("pm_test123");

        // Act & Assert
        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testGetUserSubscriptions_Success() throws Exception {
        // Arrange
        List<DonationSubscription> subscriptions = Arrays.asList(testSubscription);
        when(subscriptionRepository.findByUserOrderByCreatedAtDesc(testUser))
            .thenReturn(subscriptions);

        // Act & Assert
        mockMvc.perform(get("/donations/subscriptions")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(testSubscription.getId().toString()))
                .andExpect(jsonPath("$[0].amount").value(100.00))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));

        verify(subscriptionRepository).findByUserOrderByCreatedAtDesc(testUser);
    }

    @Test
    void testCancelSubscription_Success() throws Exception {
        // Arrange
        String subscriptionId = testSubscription.getId().toString();
        testSubscription.setStatus(SubscriptionStatus.CANCELED);
        testSubscription.setCanceledAt(LocalDateTime.now());

        when(stripeSubscriptionService.cancelSubscription(subscriptionId, testUser))
            .thenReturn(testSubscription);

        // Act & Assert
        mockMvc.perform(put("/donations/subscriptions/" + subscriptionId + "/cancel")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(subscriptionId))
                .andExpect(jsonPath("$.status").value("CANCELED"));

        verify(stripeSubscriptionService).cancelSubscription(subscriptionId, testUser);
    }

    @Test
    void testUpdateSubscriptionPaymentMethod_Success() throws Exception {
        // Arrange
        String subscriptionId = testSubscription.getId().toString();
        String newPaymentMethodId = "pm_new123";

        when(stripeSubscriptionService.updatePaymentMethod(subscriptionId, newPaymentMethodId, testUser))
            .thenReturn(testSubscription);

        // Act & Assert
        mockMvc.perform(put("/donations/subscriptions/" + subscriptionId + "/payment-method")
                .param("paymentMethodId", newPaymentMethodId)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(subscriptionId));

        verify(stripeSubscriptionService).updatePaymentMethod(subscriptionId, newPaymentMethodId, testUser);
    }

    @Test
    void testCreateSubscription_MissingPaymentMethod() throws Exception {
        // Arrange
        SubscriptionRequest request = new SubscriptionRequest();
        request.setAmount(BigDecimal.valueOf(100.00));
        request.setCategory(DonationCategory.TITHES);
        request.setFrequency(RecurringFrequency.MONTHLY);
        // Missing payment method ID

        // Act & Assert
        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testCancelSubscription_NotFound() throws Exception {
        // Arrange
        String nonExistentId = UUID.randomUUID().toString();

        when(stripeSubscriptionService.cancelSubscription(nonExistentId, testUser))
            .thenThrow(new RuntimeException("Subscription not found"));

        // Act & Assert
        mockMvc.perform(put("/donations/subscriptions/" + nonExistentId + "/cancel")
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testSubscriptionFrequencyValidation() throws Exception {
        // Test all valid frequencies
        for (RecurringFrequency frequency : RecurringFrequency.values()) {
            SubscriptionRequest request = new SubscriptionRequest();
            request.setAmount(BigDecimal.valueOf(50.00));
            request.setCategory(DonationCategory.OFFERINGS);
            request.setFrequency(frequency);
            request.setPaymentMethodId("pm_test123");

            testSubscription.setFrequency(frequency);
            when(stripeSubscriptionService.createSubscription(any(), any(), any(), eq(frequency), any(), any()))
                .thenReturn(testSubscription);

            mockMvc.perform(post("/donations/subscriptions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .principal(authentication))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.frequency").value(frequency.name()));
        }
    }

    @Test
    void testSubscriptionCategoryValidation() throws Exception {
        // Test all valid categories
        for (DonationCategory category : DonationCategory.values()) {
            SubscriptionRequest request = new SubscriptionRequest();
            request.setAmount(BigDecimal.valueOf(50.00));
            request.setCategory(category);
            request.setFrequency(RecurringFrequency.MONTHLY);
            request.setPaymentMethodId("pm_test123");

            testSubscription.setCategory(category);
            when(stripeSubscriptionService.createSubscription(any(), any(), eq(category), any(), any(), any()))
                .thenReturn(testSubscription);

            mockMvc.perform(post("/donations/subscriptions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .principal(authentication))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.category").value(category.name()));
        }
    }
}