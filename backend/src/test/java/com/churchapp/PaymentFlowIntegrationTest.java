package com.churchapp;

import com.churchapp.controller.DonationController;
import com.churchapp.dto.*;
import com.churchapp.entity.*;
import com.churchapp.repository.*;
import com.churchapp.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.model.PaymentIntent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(SpringExtension.class)
@WebMvcTest(DonationController.class)
public class PaymentFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private StripePaymentService stripePaymentService;

    @MockBean
    private StripeSubscriptionService stripeSubscriptionService;

    @MockBean
    private ReceiptService receiptService;

    @MockBean
    private DonationRepository donationRepository;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private DonationSubscriptionRepository subscriptionRepository;

    @MockBean
    private Authentication authentication;

    private User testUser;
    private Donation testDonation;
    private DonationSubscription testSubscription;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("test@church.com");
        testUser.setName("Test User");
        testUser.setRole(User.UserRole.MEMBER);

        // Create test donation
        testDonation = new Donation();
        testDonation.setId(UUID.randomUUID());
        testDonation.setUser(testUser);
        testDonation.setAmount(BigDecimal.valueOf(50.00));
        testDonation.setCategory(DonationCategory.TITHES);
        testDonation.setTransactionId("pi_test123");
        testDonation.setTimestamp(LocalDateTime.now());
        testDonation.setIsRecurring(false);

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
    void testCompleteOneTimePaymentFlow() throws Exception {
        // Step 1: Create Payment Intent
        PaymentIntentRequest intentRequest = new PaymentIntentRequest();
        intentRequest.setAmount(BigDecimal.valueOf(50.00));
        intentRequest.setCategory(DonationCategory.TITHES);
        intentRequest.setPurpose("Weekly tithe");

        PaymentIntent mockPaymentIntent = mock(PaymentIntent.class);
        when(mockPaymentIntent.getClientSecret()).thenReturn("pi_test_client_secret");
        when(mockPaymentIntent.getId()).thenReturn("pi_test123");
        when(mockPaymentIntent.getStatus()).thenReturn("requires_payment_method");

        when(stripePaymentService.createPaymentIntent(
            eq(testUser),
            eq(BigDecimal.valueOf(50.00)),
            eq(DonationCategory.TITHES),
            eq("Weekly tithe"),
            any()
        )).thenReturn(mockPaymentIntent);

        // Execute Step 1
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(intentRequest))
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientSecret").value("pi_test_client_secret"))
                .andExpect(jsonPath("$.paymentIntentId").value("pi_test123"));

        // Step 2: Confirm Payment
        when(stripePaymentService.confirmPayment("pi_test123", testUser))
            .thenReturn(testDonation);
        doNothing().when(receiptService).generateAndEmailReceipt(testDonation);

        // Execute Step 2
        mockMvc.perform(post("/donations/confirm-payment")
                .param("paymentIntentId", "pi_test123")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testDonation.getId().toString()))
                .andExpect(jsonPath("$.amount").value(50.00));

        // Verify complete flow
        verify(stripePaymentService).createPaymentIntent(
            eq(testUser),
            eq(BigDecimal.valueOf(50.00)),
            eq(DonationCategory.TITHES),
            eq("Weekly tithe"),
            any()
        );
        verify(stripePaymentService).confirmPayment("pi_test123", testUser);
        verify(receiptService).generateAndEmailReceipt(testDonation);
    }

    @Test
    void testCompleteRecurringPaymentFlow() throws Exception {
        // Step 1: Create Subscription
        SubscriptionRequest subscriptionRequest = new SubscriptionRequest();
        subscriptionRequest.setAmount(BigDecimal.valueOf(100.00));
        subscriptionRequest.setCategory(DonationCategory.TITHES);
        subscriptionRequest.setFrequency(RecurringFrequency.MONTHLY);
        subscriptionRequest.setPurpose("Monthly tithe");
        subscriptionRequest.setPaymentMethodId("pm_test123");

        when(stripeSubscriptionService.createSubscription(
            eq(testUser),
            eq(BigDecimal.valueOf(100.00)),
            eq(DonationCategory.TITHES),
            eq(RecurringFrequency.MONTHLY),
            eq("Monthly tithe"),
            eq("pm_test123")
        )).thenReturn(testSubscription);

        // Execute Step 1: Create Subscription
        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(subscriptionRequest))
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testSubscription.getId().toString()))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.frequency").value("MONTHLY"));

        // Step 2: Verify Subscription Status
        when(subscriptionRepository.findByUserOrderByCreatedAtDesc(testUser))
            .thenReturn(java.util.Arrays.asList(testSubscription));

        mockMvc.perform(get("/donations/subscriptions")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(testSubscription.getId().toString()))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"));

        // Step 3: Cancel Subscription
        testSubscription.setStatus(SubscriptionStatus.CANCELED);
        testSubscription.setCanceledAt(LocalDateTime.now());

        when(stripeSubscriptionService.cancelSubscription(testSubscription.getId().toString(), testUser))
            .thenReturn(testSubscription);

        mockMvc.perform(put("/donations/subscriptions/" + testSubscription.getId() + "/cancel")
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELED"));

        // Verify complete flow
        verify(stripeSubscriptionService).createSubscription(
            eq(testUser),
            eq(BigDecimal.valueOf(100.00)),
            eq(DonationCategory.TITHES),
            eq(RecurringFrequency.MONTHLY),
            eq("Monthly tithe"),
            eq("pm_test123")
        );
        verify(stripeSubscriptionService).cancelSubscription(testSubscription.getId().toString(), testUser);
    }

    @Test
    void testPaymentFlowWithFailure() throws Exception {
        // Step 1: Create Payment Intent (Success)
        PaymentIntentRequest intentRequest = new PaymentIntentRequest();
        intentRequest.setAmount(BigDecimal.valueOf(25.00));
        intentRequest.setCategory(DonationCategory.OFFERINGS);

        PaymentIntent mockPaymentIntent = mock(PaymentIntent.class);
        when(mockPaymentIntent.getClientSecret()).thenReturn("pi_test_client_secret");
        when(mockPaymentIntent.getId()).thenReturn("pi_test456");
        when(mockPaymentIntent.getStatus()).thenReturn("requires_payment_method");

        when(stripePaymentService.createPaymentIntent(any(), any(), any(), any(), any()))
            .thenReturn(mockPaymentIntent);

        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(intentRequest))
                .principal(authentication))
                .andExpect(status().isOk());

        // Step 2: Confirm Payment (Failure)
        when(stripePaymentService.confirmPayment("pi_test456", testUser))
            .thenThrow(new RuntimeException("Payment failed"));

        mockMvc.perform(post("/donations/confirm-payment")
                .param("paymentIntentId", "pi_test456")
                .principal(authentication))
                .andExpect(status().isBadRequest());

        // Verify receipt service was not called on failure
        verify(receiptService, never()).generateAndEmailReceipt(any());
    }

    @Test
    void testSubscriptionPaymentMethodUpdate() throws Exception {
        // Step 1: Create initial subscription
        SubscriptionRequest subscriptionRequest = new SubscriptionRequest();
        subscriptionRequest.setAmount(BigDecimal.valueOf(75.00));
        subscriptionRequest.setCategory(DonationCategory.MISSIONS);
        subscriptionRequest.setFrequency(RecurringFrequency.WEEKLY);
        subscriptionRequest.setPaymentMethodId("pm_original123");

        when(stripeSubscriptionService.createSubscription(any(), any(), any(), any(), any(), any()))
            .thenReturn(testSubscription);

        mockMvc.perform(post("/donations/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(subscriptionRequest))
                .principal(authentication))
                .andExpect(status().isOk());

        // Step 2: Update payment method
        String newPaymentMethodId = "pm_updated456";
        when(stripeSubscriptionService.updatePaymentMethod(
            testSubscription.getId().toString(),
            newPaymentMethodId,
            testUser
        )).thenReturn(testSubscription);

        mockMvc.perform(put("/donations/subscriptions/" + testSubscription.getId() + "/payment-method")
                .param("paymentMethodId", newPaymentMethodId)
                .principal(authentication))
                .andExpect(status().isOk());

        verify(stripeSubscriptionService).updatePaymentMethod(
            testSubscription.getId().toString(),
            newPaymentMethodId,
            testUser
        );
    }

    @Test
    void testReceiptDownloadFlow() throws Exception {
        // Step 1: Complete a donation
        when(stripePaymentService.confirmPayment("pi_test789", testUser))
            .thenReturn(testDonation);
        doNothing().when(receiptService).generateAndEmailReceipt(testDonation);

        mockMvc.perform(post("/donations/confirm-payment")
                .param("paymentIntentId", "pi_test789")
                .principal(authentication))
                .andExpect(status().isOk());

        // Step 2: Download receipt
        byte[] mockReceiptPdf = "Mock PDF content".getBytes();
        when(receiptService.downloadReceipt(testDonation.getId(), testUser))
            .thenReturn(mockReceiptPdf);

        mockMvc.perform(get("/donations/receipt/" + testDonation.getId())
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(content().bytes(mockReceiptPdf));

        verify(receiptService).downloadReceipt(testDonation.getId(), testUser);
    }

    @Test
    void testDonationHistoryFlow() throws Exception {
        // Step 1: Complete multiple donations
        Donation donation1 = new Donation();
        donation1.setId(UUID.randomUUID());
        donation1.setAmount(BigDecimal.valueOf(25.00));
        donation1.setCategory(DonationCategory.TITHES);

        Donation donation2 = new Donation();
        donation2.setId(UUID.randomUUID());
        donation2.setAmount(BigDecimal.valueOf(50.00));
        donation2.setCategory(DonationCategory.OFFERINGS);

        // Step 2: Retrieve donation history
        org.springframework.data.domain.Page<Donation> mockPage = mock(org.springframework.data.domain.Page.class);
        when(mockPage.map(any())).thenReturn(mock(org.springframework.data.domain.Page.class));

        when(donationRepository.findByUserOrderByTimestampDesc(eq(testUser), any()))
            .thenReturn(mockPage);

        mockMvc.perform(get("/donations/history")
                .param("page", "0")
                .param("size", "20")
                .principal(authentication))
                .andExpect(status().isOk());

        verify(donationRepository).findByUserOrderByTimestampDesc(eq(testUser), any());
    }

    @Test
    void testWebhookToReceiptFlow() throws Exception {
        // Simulate Stripe webhook for successful payment
        String webhookPayload = "{\"id\":\"evt_test\",\"type\":\"payment_intent.succeeded\",\"data\":{\"object\":{\"id\":\"pi_test123\"}}}";
        String stripeSignature = "t=1234567890,v1=valid_signature";

        // Mock webhook processing that creates donation and generates receipt
        doAnswer(invocation -> {
            // Simulate webhook creating donation and triggering receipt
            receiptService.generateAndEmailReceipt(testDonation);
            return null;
        }).when(stripeWebhookService).processWebhook(webhookPayload, stripeSignature);

        mockMvc.perform(post("/donations/webhook/stripe")
                .content(webhookPayload)
                .header("Stripe-Signature", stripeSignature))
                .andExpect(status().isOk());

        // Verify webhook was processed
        verify(stripeWebhookService).processWebhook(webhookPayload, stripeSignature);
    }

    @MockBean
    private StripeWebhookService stripeWebhookService;
}