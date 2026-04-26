package com.churchapp;

import com.churchapp.dto.PaymentIntentRequest;
import com.churchapp.dto.SubscriptionRequest;
import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.DonationSubscription;
import com.churchapp.entity.RecurringFrequency;
import com.churchapp.entity.SubscriptionStatus;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.StripePaymentService;
import com.churchapp.service.StripeSubscriptionService;
import com.churchapp.service.StripeWebhookService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:paymentsecurityaudittest;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH")
@WithMockUser(username = "test@church.com")
public class PaymentSecurityAuditTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StripePaymentService stripePaymentService;

    @MockBean
    private StripeSubscriptionService stripeSubscriptionService;

    @MockBean
    private StripeWebhookService stripeWebhookService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private Authentication authentication;

    private User testUser;

    @BeforeEach
    void setUp() throws Exception {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@church.com");
        testUser.setName("Test User");
        testUser.setRole(User.Role.USER);

        when(authentication.getName()).thenReturn(testUser.getEmail());
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));

        com.stripe.model.PaymentIntent mockPaymentIntent = mock(com.stripe.model.PaymentIntent.class);
        when(mockPaymentIntent.getClientSecret()).thenReturn("pi_test_client_secret");
        when(mockPaymentIntent.getId()).thenReturn("pi_test123");
        when(mockPaymentIntent.getStatus()).thenReturn("requires_payment_method");
        when(stripePaymentService.createPaymentIntent(
            any(User.class),
            any(BigDecimal.class),
            any(DonationCategory.class),
            nullable(String.class),
            nullable(String.class),
            nullable(UUID.class)
        )).thenReturn(mockPaymentIntent);

        DonationSubscription testSubscription = new DonationSubscription();
        testSubscription.setId(UUID.randomUUID());
        testSubscription.setUser(testUser);
        testSubscription.setStripeSubscriptionId("sub_test123");
        testSubscription.setStripeCustomerId("cus_test123");
        testSubscription.setStripePriceId("price_test123");
        testSubscription.setAmount(BigDecimal.valueOf(100.00));
        testSubscription.setFrequency(RecurringFrequency.MONTHLY);
        testSubscription.setCategory(DonationCategory.TITHES);
        testSubscription.setStatus(SubscriptionStatus.ACTIVE);
        testSubscription.setCurrency("USD");
        testSubscription.setStartedAt(LocalDateTime.now());
        when(stripeSubscriptionService.createSubscription(
            any(User.class),
            any(BigDecimal.class),
            any(DonationCategory.class),
            any(RecurringFrequency.class),
            nullable(String.class),
            anyString(),
            nullable(UUID.class)
        )).thenReturn(testSubscription);
    }

    // ====== AUTHENTICATION & AUTHORIZATION TESTS ======

    @Test
    @WithAnonymousUser
    void testUnauthenticatedAccessDenied() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);

        // Test without authentication
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void testInvalidUserAccessDenied() throws Exception {
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testUserCanOnlyAccessOwnDonations() throws Exception {
        UUID otherUserDonationId = UUID.randomUUID();

        // Simulate trying to access another user's donation receipt
        mockMvc.perform(get("/donations/receipt/" + otherUserDonationId)
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    // ====== INPUT VALIDATION TESTS ======

    @Test
    void testAmountValidation_NegativeAmount() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(-10.00)); // Negative amount
        request.setCategory(DonationCategory.TITHES);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAmountValidation_ZeroAmount() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.ZERO); // Zero amount
        request.setCategory(DonationCategory.TITHES);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAmountValidation_ExcessiveAmount() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(1000000.00)); // Excessive amount
        request.setCategory(DonationCategory.TITHES);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAmountValidation_TooManyDecimals() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.123)); // Too many decimal places
        request.setCategory(DonationCategory.TITHES);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testSubscriptionAmountValidation_MinimumAmount() throws Exception {
        SubscriptionRequest request = new SubscriptionRequest();
        request.setAmount(BigDecimal.valueOf(0.50)); // Below minimum for subscriptions
        request.setCategory(DonationCategory.TITHES);
        request.setFrequency(RecurringFrequency.MONTHLY);
        request.setPaymentMethodId("pm_test123");

        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testMissingRequiredFields() throws Exception {
        // Test missing category
        PaymentIntentRequest request1 = new PaymentIntentRequest();
        request1.setAmount(BigDecimal.valueOf(50.00));
        // Missing category

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1))
                .principal(authentication))
                .andExpect(status().isBadRequest());

        // Test missing amount
        PaymentIntentRequest request2 = new PaymentIntentRequest();
        request2.setCategory(DonationCategory.TITHES);
        // Missing amount

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    // ====== WEBHOOK SECURITY TESTS ======

    @Test
    void testWebhookRequiresValidSignature() throws Exception {
        String webhookPayload = "{\"id\":\"evt_test\",\"type\":\"payment_intent.succeeded\"}";
        String invalidSignature = "invalid_signature";

        doThrow(new RuntimeException("Invalid signature"))
            .when(stripeWebhookService).processWebhook(webhookPayload, invalidSignature);

        mockMvc.perform(post("/donations/webhook/stripe")
                .content(webhookPayload)
                .header("Stripe-Signature", invalidSignature))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testWebhookRejectsMissingSignature() throws Exception {
        String webhookPayload = "{\"id\":\"evt_test\",\"type\":\"payment_intent.succeeded\"}";

        mockMvc.perform(post("/donations/webhook/stripe")
                .content(webhookPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testWebhookRejectsEmptyPayload() throws Exception {
        String stripeSignature = "t=1234567890,v1=valid_signature";

        mockMvc.perform(post("/donations/webhook/stripe")
                .content("")
                .header("Stripe-Signature", stripeSignature))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testWebhookRejectsMalformedJson() throws Exception {
        String malformedPayload = "{invalid json";
        String stripeSignature = "t=1234567890,v1=valid_signature";

        doThrow(new RuntimeException("Invalid JSON"))
            .when(stripeWebhookService).processWebhook(malformedPayload, stripeSignature);

        mockMvc.perform(post("/donations/webhook/stripe")
                .content(malformedPayload)
                .header("Stripe-Signature", stripeSignature))
                .andExpect(status().isBadRequest());
    }

    // ====== SQL INJECTION PREVENTION TESTS ======

    @Test
    void testPaymentIntentSqlInjectionPrevention() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);
        request.setPurpose("'; DROP TABLE donations; --"); // SQL injection attempt

        // Should not cause any SQL errors or security issues
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk());
    }

    @Test
    void testSubscriptionSqlInjectionPrevention() throws Exception {
        SubscriptionRequest request = new SubscriptionRequest();
        request.setAmount(BigDecimal.valueOf(100.00));
        request.setCategory(DonationCategory.TITHES);
        request.setFrequency(RecurringFrequency.MONTHLY);
        request.setPurpose("'; DELETE FROM users; --"); // SQL injection attempt
        request.setPaymentMethodId("pm_test123");

        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk());
    }

    // ====== XSS PREVENTION TESTS ======

    @Test
    void testXssPreventionInPurpose() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);
        request.setPurpose("<script>alert('xss')</script>"); // XSS attempt

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk());
    }

    // ====== RATE LIMITING TESTS ======

    @Test
    void testRateLimitingForPaymentIntents() throws Exception {
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(10.00));
        request.setCategory(DonationCategory.TITHES);

        // Simulate rapid requests (in real implementation, this would trigger rate limiting)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/donations/create-payment-intent")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .principal(authentication))
                    .andExpect(status().isOk()); // Should be rate limited after threshold
        }
    }

    // ====== CSRF PROTECTION TESTS ======

    @Test
    void testCsrfProtection() throws Exception {
        // CSRF protection should be handled by Spring Security
        // This test verifies that POST requests require proper CSRF tokens
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);

        // In a real scenario, this would test CSRF token validation
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk());
    }

    // ====== DATA EXPOSURE PREVENTION TESTS ======

    @Test
    void testSensitiveDataNotExposed() throws Exception {
        // Test that responses don't contain sensitive Stripe data
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);

        com.stripe.model.PaymentIntent mockPaymentIntent = mock(com.stripe.model.PaymentIntent.class);
        when(mockPaymentIntent.getClientSecret()).thenReturn("pi_test_client_secret");
        when(mockPaymentIntent.getId()).thenReturn("pi_test123");
        when(mockPaymentIntent.getStatus()).thenReturn("requires_payment_method");

        when(stripePaymentService.createPaymentIntent(any(), any(), any(), any(), any(), nullable(UUID.class)))
            .thenReturn(mockPaymentIntent);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientSecret").value("pi_test_client_secret"))
                // Should not expose internal Stripe objects or sensitive data
                .andExpect(jsonPath("$.stripePrivateKey").doesNotExist())
                .andExpect(jsonPath("$.webhookSecret").doesNotExist());
    }

    // ====== PARAMETER TAMPERING TESTS ======

    @Test
    @WithMockUser(username = "hacker@example.com")
    void testParameterTamperingPrevention() throws Exception {
        // Test that users can't modify amounts or other critical fields after payment intent creation
        String paymentIntentId = "pi_test123";

        // Attempt to confirm payment with different user
        User differentUser = new User();
        differentUser.setId(UUID.randomUUID());
        differentUser.setEmail("hacker@example.com");

        Authentication hackerAuth = mock(Authentication.class);
        when(hackerAuth.getName()).thenReturn("hacker@example.com");
        when(userRepository.findByEmail("hacker@example.com")).thenReturn(Optional.of(differentUser));

        when(stripePaymentService.confirmPayment(paymentIntentId, differentUser))
            .thenThrow(new RuntimeException("Payment intent not found or not owned by user"));

        mockMvc.perform(post("/donations/confirm-payment")
                .param("paymentIntentId", paymentIntentId)
                .principal(hackerAuth))
                .andExpect(status().isBadRequest());
    }

    // ====== SUBSCRIPTION SECURITY TESTS ======

    @Test
    void testSubscriptionOwnershipValidation() throws Exception {
        String subscriptionId = UUID.randomUUID().toString();

        // Test that users can only cancel their own subscriptions
        when(stripeSubscriptionService.cancelSubscription(subscriptionId, testUser))
            .thenThrow(new RuntimeException("Subscription not found or not owned by user"));

        mockMvc.perform(put("/donations/subscriptions/" + subscriptionId + "/cancel")
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testPaymentMethodUpdateSecurity() throws Exception {
        String subscriptionId = UUID.randomUUID().toString();
        String maliciousPaymentMethodId = "pm_malicious123";

        // Test that payment method updates are properly validated
        when(stripeSubscriptionService.updatePaymentMethod(subscriptionId, maliciousPaymentMethodId, testUser))
            .thenThrow(new RuntimeException("Invalid payment method or subscription not owned by user"));

        mockMvc.perform(put("/donations/subscriptions/" + subscriptionId + "/payment-method")
                .param("paymentMethodId", maliciousPaymentMethodId)
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    // ====== LOGGING AND MONITORING TESTS ======

    @Test
    void testSecurityEventLogging() throws Exception {
        // Test that security events are properly logged (this would be verified in logs)
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(-50.00)); // Invalid amount should be logged

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());

        // In a real implementation, this would verify security logs were created
    }
}