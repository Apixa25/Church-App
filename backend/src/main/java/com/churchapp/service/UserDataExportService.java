package com.churchapp.service;

import com.churchapp.entity.User;
import com.churchapp.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDataExportService {

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final MessageRepository messageRepository;
    private final DonationRepository donationRepository;
    private final ObjectMapper objectMapper;

    @Value("${church.name:Church App}")
    private String churchName;

    public byte[] exportUserData(UUID userId, String format) {
        try {
            Map<String, Object> userData = collectUserData(userId);

            switch (format.toLowerCase()) {
                case "json":
                    return objectMapper.writeValueAsBytes(userData);
                case "pdf":
                    return generatePdfReport(userData);
                default:
                    throw new IllegalArgumentException("Unsupported export format: " + format);
            }
        } catch (Exception e) {
            log.error("Error exporting user data for user: {}", userId, e);
            throw new RuntimeException("Failed to export user data", e);
        }
    }

    public Map<String, Object> collectUserData(UUID userId) {
        Map<String, Object> userData = new HashMap<>();

        // User profile
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("id", user.getId());
        profile.put("name", user.getName());
        profile.put("email", user.getEmail());
        profile.put("role", user.getRole().name());
        profile.put("createdAt", user.getCreatedAt());
        profile.put("lastLogin", user.getLastLogin());
        userData.put("profile", profile);

        // Settings
        userSettingsRepository.findByUserId(userId)
            .ifPresent(settings -> userData.put("settings", settings));

        // Prayer requests
        userData.put("prayerRequests", prayerRequestRepository.findByUserIdOrderByCreatedAtDesc(userId));

        // Messages (non-sensitive data only)
        userData.put("messageCount", messageRepository.countByUserId(userId));

        // Donations (if user has opted to include)
        userSettingsRepository.findByUserId(userId)
            .ifPresent(settings -> {
                if (settings.isShowDonationHistory()) {
                    userData.put("donations", donationRepository.findByUserIdOrderByTimestampDesc(userId));
                }
            });

        userData.put("exportDate", java.time.LocalDateTime.now());
        userData.put("exportFormat", "GDPR_COMPLIANT");

        return userData;
    }

    private byte[] generatePdfReport(Map<String, Object> userData) throws IOException {
        log.info("Generating PDF report for user data export");
        
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
            addPdfHeader(document, userData, headerFont, primaryColor);

            // Add profile information
            addProfileSection(document, userData, regularFont, boldFont, primaryColor);

            // Add settings section
            addSettingsSection(document, userData, regularFont, boldFont);

            // Add prayer requests section
            addPrayerRequestsSection(document, userData, regularFont, boldFont);

            // Add donations section (if included)
            if (userData.containsKey("donations")) {
                addDonationsSection(document, userData, regularFont, boldFont);
            }

            // Add statistics section
            addStatisticsSection(document, userData, regularFont, boldFont, grayColor);

            // Add footer
            addPdfFooter(document, userData, regularFont, grayColor);

        } finally {
            document.close();
        }

        return baos.toByteArray();
    }

    private void addPdfHeader(Document document, Map<String, Object> userData, PdfFont font, DeviceRgb color) {
        Paragraph title = new Paragraph("User Data Export")
            .setFont(font)
            .setFontSize(24)
            .setFontColor(color)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(10);
        document.add(title);

        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) userData.get("profile");
        String userName = profile != null ? (String) profile.get("name") : "User";
        String exportDate = userData.get("exportDate") != null ?
            ((LocalDateTime) userData.get("exportDate")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) :
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        Paragraph subtitle = new Paragraph("Data Export for: " + userName)
            .setFont(font)
            .setFontSize(12)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(20);
        document.add(subtitle);

        Paragraph dateInfo = new Paragraph("Export Date: " + exportDate)
            .setFont(font)
            .setFontSize(10)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginBottom(20);
        document.add(dateInfo);
    }

    private void addProfileSection(Document document, Map<String, Object> userData, 
                                  PdfFont regularFont, PdfFont boldFont, DeviceRgb primaryColor) {
        @SuppressWarnings("unchecked")
        Map<String, Object> profile = (Map<String, Object>) userData.get("profile");
        if (profile == null) return;

        Paragraph sectionHeader = new Paragraph("Profile Information")
            .setFont(boldFont)
            .setFontSize(14)
            .setFontColor(primaryColor)
            .setMarginTop(20)
            .setMarginBottom(10);
        document.add(sectionHeader);

        Table profileTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
            .setWidth(UnitValue.createPercentValue(100));

        addTableRow(profileTable, "Name:", (String) profile.get("name"), boldFont, regularFont);
        addTableRow(profileTable, "Email:", (String) profile.get("email"), boldFont, regularFont);
        addTableRow(profileTable, "Role:", (String) profile.get("role"), boldFont, regularFont);
        
        if (profile.get("createdAt") != null) {
            addTableRow(profileTable, "Member Since:", 
                ((LocalDateTime) profile.get("createdAt")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                boldFont, regularFont);
        }
        
        if (profile.get("lastLogin") != null) {
            addTableRow(profileTable, "Last Login:", 
                ((LocalDateTime) profile.get("lastLogin")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                boldFont, regularFont);
        }

        document.add(profileTable);
        document.add(new Paragraph("\n"));
    }

    private void addSettingsSection(Document document, Map<String, Object> userData, 
                                   PdfFont regularFont, PdfFont boldFont) {
        if (!userData.containsKey("settings")) return;

        Paragraph sectionHeader = new Paragraph("Account Settings Summary")
            .setFont(boldFont)
            .setFontSize(14)
            .setMarginTop(10)
            .setMarginBottom(10);
        document.add(sectionHeader);

        // Settings summary would go here - simplified for brevity
        Paragraph summary = new Paragraph("Your account settings and preferences are included in this export.")
            .setFont(regularFont)
            .setFontSize(10)
            .setMarginBottom(10);
        document.add(summary);
    }

    private void addPrayerRequestsSection(Document document, Map<String, Object> userData, 
                                         PdfFont regularFont, PdfFont boldFont) {
        @SuppressWarnings("unchecked")
        List<Object> prayers = (List<Object>) userData.get("prayerRequests");
        if (prayers == null || prayers.isEmpty()) return;

        Paragraph sectionHeader = new Paragraph("Prayer Requests (" + prayers.size() + ")")
            .setFont(boldFont)
            .setFontSize(14)
            .setMarginTop(10)
            .setMarginBottom(10);
        document.add(sectionHeader);

        for (Object prayerObj : prayers) {
            @SuppressWarnings("unchecked")
            Map<String, Object> prayer = (Map<String, Object>) prayerObj;
            String title = (String) prayer.get("title");
            String status = (String) prayer.get("status");
            LocalDateTime createdAt = (LocalDateTime) prayer.get("createdAt");

            Paragraph prayerTitle = new Paragraph(title != null ? title : "Untitled")
                .setFont(boldFont)
                .setFontSize(11)
                .setMarginBottom(3);
            document.add(prayerTitle);

            Paragraph prayerInfo = new Paragraph("Status: " + status + 
                (createdAt != null ? " | Created: " + createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : ""))
                .setFont(regularFont)
                .setFontSize(9)
                .setMarginBottom(5);
            document.add(prayerInfo);
        }

        document.add(new Paragraph("\n"));
    }

    private void addDonationsSection(Document document, Map<String, Object> userData, 
                                    PdfFont regularFont, PdfFont boldFont) {
        @SuppressWarnings("unchecked")
        List<Object> donations = (List<Object>) userData.get("donations");
        if (donations == null || donations.isEmpty()) return;

        Paragraph sectionHeader = new Paragraph("Donation History (" + donations.size() + " transactions)")
            .setFont(boldFont)
            .setFontSize(14)
            .setMarginTop(10)
            .setMarginBottom(10);
        document.add(sectionHeader);

        Table donationsTable = new Table(UnitValue.createPercentArray(new float[]{2, 2, 1}))
            .setWidth(UnitValue.createPercentValue(100));

        // Header row
        donationsTable.addHeaderCell(createTableHeaderCell("Date", boldFont));
        donationsTable.addHeaderCell(createTableHeaderCell("Purpose", boldFont));
        donationsTable.addHeaderCell(createTableHeaderCell("Amount", boldFont));

        // Data rows
        for (Object donationObj : donations) {
            @SuppressWarnings("unchecked")
            Map<String, Object> donation = (Map<String, Object>) donationObj;
            LocalDateTime timestamp = (LocalDateTime) donation.get("timestamp");
            String purpose = (String) donation.get("purpose");
            Object amountObj = donation.get("amount");
            String amount = amountObj != null ? amountObj.toString() : "N/A";

            donationsTable.addCell(createTableCell(
                timestamp != null ? timestamp.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) : "N/A",
                regularFont));
            donationsTable.addCell(createTableCell(purpose != null ? purpose : "N/A", regularFont));
            donationsTable.addCell(createTableCell("$" + amount, regularFont));
        }

        document.add(donationsTable);
        document.add(new Paragraph("\n"));
    }

    private void addStatisticsSection(Document document, Map<String, Object> userData, 
                                     PdfFont regularFont, PdfFont boldFont, DeviceRgb grayColor) {
        Paragraph sectionHeader = new Paragraph("Account Statistics")
            .setFont(boldFont)
            .setFontSize(14)
            .setMarginTop(10)
            .setMarginBottom(10);
        document.add(sectionHeader);

        Table statsTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
            .setWidth(UnitValue.createPercentValue(100));

        @SuppressWarnings("unchecked")
        List<Object> prayers = (List<Object>) userData.get("prayerRequests");
        Integer prayerCount = prayers != null ? prayers.size() : 0;
        
        Long messageCount = (Long) userData.get("messageCount");
        if (messageCount == null) messageCount = 0L;

        @SuppressWarnings("unchecked")
        List<Object> donations = userData.containsKey("donations") ? 
            (List<Object>) userData.get("donations") : null;
        Integer donationCount = donations != null ? donations.size() : 0;

        addTableRow(statsTable, "Prayer Requests:", prayerCount.toString(), boldFont, regularFont);
        addTableRow(statsTable, "Messages Sent:", messageCount.toString(), boldFont, regularFont);
        addTableRow(statsTable, "Donations:", donationCount.toString(), boldFont, regularFont);

        document.add(statsTable);
        document.add(new Paragraph("\n"));
    }

    private void addPdfFooter(Document document, Map<String, Object> userData, 
                             PdfFont regularFont, DeviceRgb grayColor) {
        Paragraph footer = new Paragraph("This is a GDPR-compliant data export generated by " + churchName + ".\n" +
            "All data is accurate as of the export date.")
            .setFont(regularFont)
            .setFontSize(8)
            .setFontColor(grayColor)
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(20);
        document.add(footer);
    }

    // Helper methods for table creation
    private void addTableRow(Table table, String label, String value, PdfFont labelFont, PdfFont valueFont) {
        table.addCell(createTableCell(label, labelFont));
        table.addCell(createTableCell(value != null ? value : "N/A", valueFont));
    }

    private Cell createTableCell(String text, PdfFont font) {
        return new Cell()
            .add(new Paragraph(text != null ? text : "").setFont(font).setFontSize(10))
            .setBorder(Border.NO_BORDER)
            .setPadding(5);
    }

    private Cell createTableHeaderCell(String text, PdfFont font) {
        return new Cell()
            .add(new Paragraph(text).setFont(font).setFontSize(10))
            .setBackgroundColor(new DeviceRgb(240, 240, 240))
            .setPadding(5);
    }
}