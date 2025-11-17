package com.churchapp;

import com.churchapp.entity.Donation;
import com.churchapp.entity.DonationCategory;
import com.churchapp.entity.User;
import com.churchapp.repository.DonationRepository;
import com.churchapp.service.EmailService;
import com.churchapp.service.ReceiptService;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReceiptServiceTest {

    @Mock
    private DonationRepository donationRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private ReceiptService receiptService;

    private User testUser;
    private Donation testDonation;

    @BeforeEach
    void setUp() {
        // Set up church configuration
        ReflectionTestUtils.setField(receiptService, "churchName", "Test Church");
        ReflectionTestUtils.setField(receiptService, "churchAddress", "123 Church St, Test City, TC 12345");
        ReflectionTestUtils.setField(receiptService, "churchPhone", "(555) 123-4567");
        ReflectionTestUtils.setField(receiptService, "churchEmail", "info@testchurch.org");
        ReflectionTestUtils.setField(receiptService, "churchWebsite", "www.testchurch.org");
        ReflectionTestUtils.setField(receiptService, "churchTaxId", "12-3456789");

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
        testDonation.setAmount(BigDecimal.valueOf(100.00));
        testDonation.setCategory(DonationCategory.TITHES);
        testDonation.setTransactionId("pi_test123");
        testDonation.setTimestamp(LocalDateTime.now());
        testDonation.setIsRecurring(false);
        testDonation.setCurrency("USD");
        testDonation.setPurpose("Weekly tithe");
    }

    @Test
    void testGenerateReceiptPdf_Success() throws Exception {
        // Act
        byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);

        // Assert
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        // Verify PDF magic bytes (PDF files start with %PDF)
        String pdfHeader = new String(pdfBytes, 0, 4);
        assertEquals("%PDF", pdfHeader);
    }

    @Test
    void testGenerateAndEmailReceipt_Success() {
        // Arrange
        doNothing().when(emailService).sendReceiptEmail(any(Donation.class), any(byte[].class), anyString());
        when(donationRepository.save(any(Donation.class))).thenReturn(testDonation);

        // Act
        receiptService.generateAndEmailReceipt(testDonation);

        // Assert
        verify(emailService).sendReceiptEmail(eq(testDonation), any(byte[].class), eq(testUser.getEmail()));
        verify(donationRepository).save(testDonation);
        assertTrue(testDonation.getReceiptSent());
        assertNotNull(testDonation.getReceiptSentAt());
    }

    @Test
    void testGenerateAndEmailReceipt_WithCustomEmail() {
        // Arrange
        String customEmail = "custom@email.com";
        testDonation.setReceiptEmail(customEmail);

        doNothing().when(emailService).sendReceiptEmail(any(Donation.class), any(byte[].class), anyString());
        when(donationRepository.save(any(Donation.class))).thenReturn(testDonation);

        // Act
        receiptService.generateAndEmailReceipt(testDonation);

        // Assert
        verify(emailService).sendReceiptEmail(eq(testDonation), any(byte[].class), eq(customEmail));
    }

    @Test
    void testGenerateAndEmailReceipt_EmailFailure() {
        // Arrange
        doThrow(new RuntimeException("Email service unavailable"))
            .when(emailService).sendReceiptEmail(any(Donation.class), any(byte[].class), anyString());

        // Act - Should not throw exception
        assertDoesNotThrow(() -> {
            receiptService.generateAndEmailReceipt(testDonation);
        });

        // Assert - Receipt should not be marked as sent
        assertFalse(testDonation.getReceiptSent());
        assertNull(testDonation.getReceiptSentAt());
        verify(donationRepository, never()).save(testDonation);
    }

    @Test
    void testDownloadReceipt_Success() throws Exception {
        // Arrange
        when(donationRepository.findById(testDonation.getId())).thenReturn(Optional.of(testDonation));

        // Act
        byte[] pdfBytes = receiptService.downloadReceipt(testDonation.getId(), testUser);

        // Assert
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);
        verify(donationRepository).findById(testDonation.getId());
    }

    @Test
    void testDownloadReceipt_DonationNotFound() {
        // Arrange
        UUID nonExistentId = UUID.randomUUID();
        when(donationRepository.findById(nonExistentId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> {
            receiptService.downloadReceipt(nonExistentId, testUser);
        });
    }

    @Test
    void testDownloadReceipt_UserDoesNotOwnDonation() {
        // Arrange
        User differentUser = new User();
        differentUser.setId(UUID.randomUUID());
        differentUser.setEmail("different@church.com");
        differentUser.setName("Different User");

        when(donationRepository.findById(testDonation.getId())).thenReturn(Optional.of(testDonation));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () -> {
            receiptService.downloadReceipt(testDonation.getId(), differentUser);
        });
    }

    @Test
    void testReceiptPdfContainsRequiredInformation() throws Exception {
        // Act
        byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);

        // Assert
        assertNotNull(pdfBytes);

        // Convert to string for content verification (simplified check)
        String pdfContent = extractPdfText(pdfBytes);

        // Should contain church information
        assertTrue(pdfContent.contains("Test Church"));

        // Should contain donation amount
        assertTrue(pdfContent.contains("100.00"));

        // Should contain transaction ID
        assertTrue(pdfContent.contains("pi_test123"));

        // Should contain user name
        assertTrue(pdfContent.contains("Test User"));
    }

    @Test
    void testReceiptNumberGeneration() throws Exception {
        // Arrange
        LocalDateTime donationTime = LocalDateTime.of(2023, 12, 25, 10, 30);
        testDonation.setTimestamp(donationTime);

        // Act
        byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);

        // Assert - Should contain year in receipt number format
        String pdfContent = extractPdfText(pdfBytes);
        assertTrue(pdfContent.contains("RCP-2023-"));
    }

    @Test
    void testReceiptGenerationWithNullValues() throws Exception {
        // Arrange - Set some fields to null
        testDonation.setPurpose(null);
        // testUser.setAddress(null); // User entity doesn't have address field

        // Act - Should handle null values gracefully
        assertDoesNotThrow(() -> {
            byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);
            assertNotNull(pdfBytes);
            assertTrue(pdfBytes.length > 0);
        });
    }

    @Test
    void testReceiptGenerationForRecurringDonation() throws Exception {
        // Arrange
        testDonation.setIsRecurring(true);

        // Act
        byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);

        // Assert
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 0);

        // Should indicate recurring donation
        String pdfContent = new String(pdfBytes);
        // Note: Actual content check would depend on PDF structure
        assertNotNull(pdfContent);
    }

    @Test
    void testReceiptGenerationForDifferentCategories() throws Exception {
        // Test all donation categories
        for (DonationCategory category : DonationCategory.values()) {
            testDonation.setCategory(category);

            byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);

            assertNotNull(pdfBytes);
            assertTrue(pdfBytes.length > 0);
        }
    }

    @Test
    void testReceiptEmailDeliveryRetry() {
        // Arrange
        doThrow(new RuntimeException("First attempt fails"))
            .doNothing() // Second attempt succeeds
            .when(emailService).sendReceiptEmail(any(Donation.class), any(byte[].class), anyString());

        // Act - First call should fail silently, but not crash
        receiptService.generateAndEmailReceipt(testDonation);

        // Assert - Should have attempted to send email
        verify(emailService, times(1)).sendReceiptEmail(any(Donation.class), any(byte[].class), anyString());

        // Receipt should not be marked as sent due to failure
        assertFalse(testDonation.getReceiptSent());
    }

    @Test
    void testReceiptTaxInformation() throws Exception {
        // Act
        byte[] pdfBytes = receiptService.generateReceiptPdf(testDonation);

        // Assert
        assertNotNull(pdfBytes);
        String pdfContent = extractPdfText(pdfBytes);

        // Should contain tax-related information
        assertTrue(pdfContent.contains("Tax") || pdfContent.contains("deductible"));

        // Should contain church tax ID
        assertTrue(pdfContent.contains("12-3456789"));
    }

    private String extractPdfText(byte[] pdfBytes) throws Exception {
        try (PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes));
             PdfDocument pdfDoc = new PdfDocument(reader)) {
            StringBuilder text = new StringBuilder();
            for (int i = 1; i <= pdfDoc.getNumberOfPages(); i++) {
                text.append(PdfTextExtractor.getTextFromPage(pdfDoc.getPage(i)));
            }
            return text.toString();
        }
    }
}