package com.churchapp;

import com.churchapp.controller.DonationController;
import com.churchapp.dto.*;
import com.churchapp.entity.Donation;
import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.User;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.StripePaymentService;
import com.churchapp.service.StripeSubscriptionService;
import com.churchapp.service.StripeWebhookService;
import com.churchapp.service.ReceiptService;
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
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class DonationControllerTest {

    @Mock
    private StripePaymentService stripePaymentService;

    @Mock
    private StripeSubscriptionService stripeSubscriptionService;

    @Mock
    private ReceiptService receiptService;

    @Mock
    private StripeWebhookService stripeWebhookService;

    @Mock
    private DonationRepository donationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private DonationController donationController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private User testUser;
    private Donation testDonation;

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

        // Create test donation
        testDonation = new Donation();
        testDonation.setId(UUID.randomUUID());
        testDonation.setUser(testUser);
        testDonation.setAmount(BigDecimal.valueOf(50.00));
        testDonation.setCategory(DonationCategory.TITHES);
        testDonation.setTransactionId("pi_test123");
        testDonation.setTimestamp(LocalDateTime.now());
        testDonation.setIsRecurring(false);

        // Mock authentication
        when(authentication.getName()).thenReturn(testUser.getEmail());
        when(userRepository.findByEmail(testUser.getEmail())).thenReturn(Optional.of(testUser));
    }

    @Test
    void testCreatePaymentIntent_Success() throws Exception {
        // Arrange
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);
        request.setPurpose("Weekly tithe");

        com.stripe.model.PaymentIntent mockPaymentIntent = mock(com.stripe.model.PaymentIntent.class);
        when(mockPaymentIntent.getClientSecret()).thenReturn("pi_test_client_secret");
        when(mockPaymentIntent.getId()).thenReturn("pi_test123");
        when(mockPaymentIntent.getStatus()).thenReturn("requires_payment_method");
        when(mockPaymentIntent.getDescription()).thenReturn("Donation for TITHES");

        when(stripePaymentService.createPaymentIntent(
            eq(testUser),
            eq(BigDecimal.valueOf(50.00)),
            eq(DonationCategory.TITHES),
            eq("Weekly tithe"),
            any()
        )).thenReturn(mockPaymentIntent);

        // Act & Assert
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clientSecret").value("pi_test_client_secret"))
                .andExpect(jsonPath("$.paymentIntentId").value("pi_test123"))
                .andExpect(jsonPath("$.amount").value(50.00))
                .andExpect(jsonPath("$.status").value("requires_payment_method"));

        verify(stripePaymentService).createPaymentIntent(
            eq(testUser),
            eq(BigDecimal.valueOf(50.00)),
            eq(DonationCategory.TITHES),
            eq("Weekly tithe"),
            any()
        );
    }

    @Test
    void testCreatePaymentIntent_InvalidAmount() throws Exception {
        // Arrange
        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(0.50)); // Invalid amount
        request.setCategory(DonationCategory.TITHES);

        // Act & Assert
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testConfirmPayment_Success() throws Exception {
        // Arrange
        String paymentIntentId = "pi_test123";

        when(stripePaymentService.confirmPayment(paymentIntentId, testUser))
            .thenReturn(testDonation);
        doNothing().when(receiptService).generateAndEmailReceipt(testDonation);

        // Act & Assert
        mockMvc.perform(post("/donations/confirm-payment")
                .param("paymentIntentId", paymentIntentId)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testDonation.getId().toString()))
                .andExpect(jsonPath("$.amount").value(50.00))
                .andExpect(jsonPath("$.category").value("TITHES"));

        verify(stripePaymentService).confirmPayment(paymentIntentId, testUser);
        verify(receiptService).generateAndEmailReceipt(testDonation);
    }

    @Test
    void testGetDonationHistory_Success() throws Exception {
        // Arrange
        org.springframework.data.domain.Page<Donation> mockPage =
            mock(org.springframework.data.domain.Page.class);
        when(mockPage.map(any())).thenReturn(mock(org.springframework.data.domain.Page.class));

        when(donationRepository.findByUserOrderByTimestampDesc(eq(testUser), any()))
            .thenReturn(mockPage);

        // Act & Assert
        mockMvc.perform(get("/donations/history")
                .param("page", "0")
                .param("size", "20")
                .principal(authentication))
                .andExpect(status().isOk());

        verify(donationRepository).findByUserOrderByTimestampDesc(eq(testUser), any());
    }

    @Test
    void testDownloadReceipt_Success() throws Exception {
        // Arrange
        UUID donationId = testDonation.getId();
        byte[] mockReceiptPdf = "Mock PDF content".getBytes();

        when(donationRepository.findById(donationId)).thenReturn(Optional.of(testDonation));
        when(receiptService.downloadReceipt(donationId, testUser)).thenReturn(mockReceiptPdf);

        // Act & Assert
        mockMvc.perform(get("/donations/receipt/" + donationId)
                .principal(authentication))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(content().bytes(mockReceiptPdf));

        verify(receiptService).downloadReceipt(donationId, testUser);
    }

    @Test
    void testCreatePaymentIntent_UnauthorizedUser() throws Exception {
        // Arrange
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        PaymentIntentRequest request = new PaymentIntentRequest();
        request.setAmount(BigDecimal.valueOf(50.00));
        request.setCategory(DonationCategory.TITHES);

        // Act & Assert
        mockMvc.perform(post("/donations/create-payment-intent")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .principal(authentication))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testStripeWebhook_Success() throws Exception {
        // Arrange
        String webhookPayload = "mock_webhook_payload";
        String stripeSignature = "mock_signature";

        doNothing().when(stripeWebhookService).processWebhook(webhookPayload, stripeSignature);

        // Act & Assert
        mockMvc.perform(post("/donations/webhook/stripe")
                .content(webhookPayload)
                .header("Stripe-Signature", stripeSignature))
                .andExpect(status().isOk())
                .andExpect(content().string("Webhook processed successfully"));

        verify(stripeWebhookService).processWebhook(webhookPayload, stripeSignature);
    }

    @Test
    void testStripeWebhook_InvalidSignature() throws Exception {
        // Arrange
        String webhookPayload = "mock_webhook_payload";
        String invalidSignature = "invalid_signature";

        doThrow(new RuntimeException("Invalid signature"))
            .when(stripeWebhookService).processWebhook(webhookPayload, invalidSignature);

        // Act & Assert
        mockMvc.perform(post("/donations/webhook/stripe")
                .content(webhookPayload)
                .header("Stripe-Signature", invalidSignature))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Webhook processing failed"));
    }
}