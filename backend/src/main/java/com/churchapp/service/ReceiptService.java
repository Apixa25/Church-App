package com.churchapp.service;

import com.churchapp.dto.ReceiptData;
import com.churchapp.entity.Donation;
import com.churchapp.entity.User;
import com.churchapp.repository.DonationRepository;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReceiptService {

    @Value("${church.name}")
    private String churchName;

    @Value("${church.address}")
    private String churchAddress;

    @Value("${church.phone}")
    private String churchPhone;

    @Value("${church.email}")
    private String churchEmail;

    @Value("${church.website}")
    private String churchWebsite;

    @Value("${church.tax-id:00-0000000}")
    private String churchTaxId;

    private final DonationRepository donationRepository;
    private final EmailService emailService;

    /**
     * Generate PDF receipt for a donation
     */
    public byte[] generateReceiptPdf(Donation donation) throws IOException {
        log.info("Generating PDF receipt for donation {}", donation.getId());

        ReceiptData receiptData = buildReceiptData(donation);
        return createPdfReceipt(receiptData);
    }

    /**
     * Generate and email receipt automatically
     */
    @Transactional
    public void generateAndEmailReceipt(Donation donation) {
        try {
            log.info("Generating and emailing receipt for donation {}", donation.getId());

            // Generate PDF
            byte[] pdfBytes = generateReceiptPdf(donation);

            // Email receipt
            String recipientEmail = donation.getReceiptEmail() != null ?
                donation.getReceiptEmail() : donation.getUser().getEmail();

            emailService.sendReceiptEmail(donation, pdfBytes, recipientEmail);

            // Mark receipt as sent
            donation.setReceiptSent(true);
            donation.setReceiptSentAt(LocalDateTime.now());
            donationRepository.save(donation);

            log.info("Receipt generated and emailed for donation {}", donation.getId());

        } catch (Exception e) {
            log.error("Failed to generate/email receipt for donation {}: {}",
                donation.getId(), e.getMessage(), e);
            // Don't throw exception - receipt generation shouldn't block donation process
        }
    }

    /**
     * Download receipt PDF for a specific donation
     */
    public byte[] downloadReceipt(UUID donationId, User user) throws IOException {
        log.info("Downloading receipt for donation {} by user {}", donationId, user.getId());

        Donation donation = donationRepository.findById(donationId)
            .orElseThrow(() -> new IllegalArgumentException("Donation not found"));

        // Verify user owns this donation
        if (!donation.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("User does not own this donation");
        }

        return generateReceiptPdf(donation);
    }

    /**
     * Build receipt data from donation entity
     */
    private ReceiptData buildReceiptData(Donation donation) {
        ReceiptData receiptData = new ReceiptData();

        // Receipt information
        receiptData.setReceiptNumber(generateReceiptNumber(donation));
        receiptData.setIssueDate(LocalDateTime.now());
        receiptData.setTaxYear(String.valueOf(donation.getTimestamp().getYear()));

        // Church information
        receiptData.setChurchName(churchName);
        receiptData.setChurchAddress(churchAddress);
        receiptData.setChurchPhone(churchPhone);
        receiptData.setChurchEmail(churchEmail);
        receiptData.setChurchWebsite(churchWebsite);
        receiptData.setChurchTaxId(churchTaxId);

        // Donor information
        User donor = donation.getUser();
        receiptData.setDonorName(donor.getName());
        receiptData.setDonorEmail(donor.getEmail());
        receiptData.setDonorAddress(donor.getAddress()); // Assuming address field exists

        // Donation details
        receiptData.setDonationId(donation.getId());
        receiptData.setTransactionId(donation.getTransactionId());
        receiptData.setAmount(donation.getAmount());
        receiptData.setCategory(donation.getCategory());
        receiptData.setCategoryDisplayName(donation.getCategoryDisplayName());
        receiptData.setPurpose(donation.getPurpose());
        String paymentMethod = "";
        if (donation.getPaymentMethodBrand() != null && donation.getPaymentMethodLast4() != null) {
            paymentMethod = donation.getPaymentMethodBrand() + " ending in " + donation.getPaymentMethodLast4();
        } else {
            paymentMethod = "Card payment";
        }
        receiptData.setPaymentMethod(paymentMethod);
        receiptData.setDonationDate(donation.getTimestamp());
        receiptData.setCurrency(donation.getCurrency());

        // Subscription information
        receiptData.setIsRecurring(donation.getIsRecurring());
        if (donation.getSubscription() != null) {
            receiptData.setRecurringFrequency(donation.getSubscription().getFrequencyDisplayName());
            receiptData.setSubscriptionId(donation.getSubscription().getId());
        }

        // Tax information
        receiptData.setIsDeductible(true); // Assuming all donations are tax-deductible
        receiptData.setTaxStatement(receiptData.getStandardTaxStatement());

        return receiptData;
    }

    /**
     * Create PDF receipt from receipt data
     */
    private byte[] createPdfReceipt(ReceiptData receiptData) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc);

        try {
            // Set up fonts
            PdfFont headerFont = PdfFontFactory.createFont();
            PdfFont regularFont = PdfFontFactory.createFont();
            PdfFont boldFont = PdfFontFactory.createFont();

            // Colors
            DeviceRgb primaryColor = new DeviceRgb(70, 130, 180); // Steel blue
            DeviceRgb grayColor = new DeviceRgb(128, 128, 128);

            // Add header
            addHeader(document, receiptData, headerFont, primaryColor);

            // Add church information
            addChurchInfo(document, receiptData, regularFont, boldFont);

            // Add donation details
            addDonationDetails(document, receiptData, regularFont, boldFont, primaryColor);

            // Add tax statement
            addTaxStatement(document, receiptData, regularFont, grayColor);

            // Add footer
            addFooter(document, receiptData, regularFont, grayColor);

        } finally {
            document.close();
        }

        return baos.toByteArray();
    }

    private void addHeader(Document document, ReceiptData receiptData, PdfFont font, DeviceRgb color) {
        // Title
        Paragraph title = new Paragraph(receiptData.getReceiptTitle())
            .setFont(font)
            .setFontSize(24)
            .setFontColor(color)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(10);
        document.add(title);

        // Receipt number and date
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
            .setWidth(UnitValue.createPercentValue(100));

        headerTable.addCell(new Cell().add(new Paragraph("Receipt #: " + receiptData.getReceiptNumber())
            .setFont(font).setFontSize(10)).setBorder(Border.NO_BORDER));
        headerTable.addCell(new Cell().add(new Paragraph("Date: " + receiptData.getFormattedIssueDate())
            .setFont(font).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setBorder(Border.NO_BORDER));

        document.add(headerTable);
        document.add(new Paragraph("\n"));
    }

    private void addChurchInfo(Document document, ReceiptData receiptData, PdfFont regularFont, PdfFont boldFont) {
        // Church information section
        Paragraph churchHeader = new Paragraph("Charitable Organization Information")
            .setFont(boldFont)
            .setFontSize(14)
            .setMarginBottom(5);
        document.add(churchHeader);

        Table churchTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
            .setWidth(UnitValue.createPercentValue(100));

        churchTable.addCell(createInfoCell("Organization:", boldFont));
        churchTable.addCell(createInfoCell(receiptData.getChurchName(), regularFont));

        if (receiptData.getChurchAddress() != null) {
            churchTable.addCell(createInfoCell("Address:", boldFont));
            churchTable.addCell(createInfoCell(receiptData.getChurchAddress(), regularFont));
        }

        churchTable.addCell(createInfoCell("Phone:", boldFont));
        churchTable.addCell(createInfoCell(receiptData.getChurchPhone(), regularFont));

        churchTable.addCell(createInfoCell("Email:", boldFont));
        churchTable.addCell(createInfoCell(receiptData.getChurchEmail(), regularFont));

        if (receiptData.getChurchTaxId() != null) {
            churchTable.addCell(createInfoCell("Tax ID (EIN):", boldFont));
            churchTable.addCell(createInfoCell(receiptData.getChurchTaxId(), regularFont));
        }

        document.add(churchTable);
        document.add(new Paragraph("\n"));
    }

    private void addDonationDetails(Document document, ReceiptData receiptData, PdfFont regularFont,
                                  PdfFont boldFont, DeviceRgb primaryColor) {
        // Donation details section
        Paragraph donationHeader = new Paragraph("Donation Details")
            .setFont(boldFont)
            .setFontSize(14)
            .setMarginBottom(5);
        document.add(donationHeader);

        // Create donation details table
        Table donationTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
            .setWidth(UnitValue.createPercentValue(100));

        donationTable.addCell(createInfoCell("Donor Name:", boldFont));
        donationTable.addCell(createInfoCell(receiptData.getDonorName(), regularFont));

        donationTable.addCell(createInfoCell("Donation Date:", boldFont));
        donationTable.addCell(createInfoCell(receiptData.getFormattedDonationDate(), regularFont));

        donationTable.addCell(createInfoCell("Amount:", boldFont));
        Cell amountCell = new Cell().add(new Paragraph(receiptData.getFormattedAmount())
            .setFont(boldFont)
            .setFontSize(16)
            .setFontColor(primaryColor))
            .setBorder(Border.NO_BORDER);
        donationTable.addCell(amountCell);

        donationTable.addCell(createInfoCell("Category:", boldFont));
        donationTable.addCell(createInfoCell(receiptData.getCategoryDisplayName(), regularFont));

        if (receiptData.getPurpose() != null && !receiptData.getPurpose().trim().isEmpty()) {
            donationTable.addCell(createInfoCell("Purpose:", boldFont));
            donationTable.addCell(createInfoCell(receiptData.getPurpose(), regularFont));
        }

        donationTable.addCell(createInfoCell("Transaction ID:", boldFont));
        donationTable.addCell(createInfoCell(receiptData.getTransactionId(), regularFont));

        if (receiptData.getPaymentMethod() != null) {
            donationTable.addCell(createInfoCell("Payment Method:", boldFont));
            donationTable.addCell(createInfoCell(receiptData.getPaymentMethod(), regularFont));
        }

        document.add(donationTable);
        document.add(new Paragraph("\n"));
    }

    private void addTaxStatement(Document document, ReceiptData receiptData, PdfFont font, DeviceRgb grayColor) {
        Paragraph taxHeader = new Paragraph("Tax Information")
            .setFont(font)
            .setFontSize(14)
            .setMarginBottom(5);
        document.add(taxHeader);

        Paragraph taxStatement = new Paragraph(receiptData.getTaxStatement())
            .setFont(font)
            .setFontSize(10)
            .setFontColor(grayColor)
            .setMarginBottom(20);
        document.add(taxStatement);
    }

    private void addFooter(Document document, ReceiptData receiptData, PdfFont font, DeviceRgb grayColor) {
        Paragraph footer = new Paragraph(receiptData.getReceiptFooter())
            .setFont(font)
            .setFontSize(10)
            .setFontColor(grayColor)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(30);
        document.add(footer);

        // Add generation timestamp
        Paragraph timestamp = new Paragraph("Receipt generated on " +
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a")))
            .setFont(font)
            .setFontSize(8)
            .setFontColor(grayColor)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(10);
        document.add(timestamp);
    }

    private Cell createInfoCell(String text, PdfFont font) {
        return new Cell().add(new Paragraph(text != null ? text : "")
            .setFont(font)
            .setFontSize(11))
            .setBorder(Border.NO_BORDER)
            .setPaddingBottom(3);
    }

    private String generateReceiptNumber(Donation donation) {
        return String.format("RCP-%d-%s",
            donation.getTimestamp().getYear(),
            donation.getId().toString().substring(0, 8).toUpperCase());
    }
}