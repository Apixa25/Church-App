package com.churchapp.dto;

import com.churchapp.entity.DonationCategory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptData {

    // Receipt information
    private String receiptNumber;
    private LocalDateTime issueDate;
    private String taxYear;

    // Church information
    private String churchName;
    private String churchAddress;
    private String churchPhone;
    private String churchEmail;
    private String churchWebsite;
    private String churchTaxId; // EIN for tax purposes

    // Donor information
    private String donorName;
    private String donorEmail;
    private String donorAddress;

    // Donation details
    private UUID donationId;
    private String transactionId;
    private BigDecimal amount;
    private DonationCategory category;
    private String categoryDisplayName;
    private String purpose;
    private String paymentMethod;
    private LocalDateTime donationDate;
    private String currency;

    // Subscription information (if applicable)
    private Boolean isRecurring;
    private String recurringFrequency;
    private UUID subscriptionId;

    // Tax information
    private String taxStatement;
    private Boolean isDeductible;

    // Helper methods for formatting
    public String getFormattedAmount() {
        return amount != null ? String.format("$%.2f", amount) : "$0.00";
    }

    public String getFormattedDonationDate() {
        return donationDate != null ?
            donationDate.format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a")) : "";
    }

    public String getFormattedIssueDate() {
        return issueDate != null ?
            issueDate.format(DateTimeFormatter.ofPattern("MMMM d, yyyy")) : "";
    }

    public String getReceiptTitle() {
        return isRecurring != null && isRecurring ?
            "Recurring Donation Receipt" : "Donation Receipt";
    }

    public String getDonationDescription() {
        StringBuilder description = new StringBuilder();

        if (categoryDisplayName != null) {
            description.append(categoryDisplayName);
        }

        if (purpose != null && !purpose.trim().isEmpty()) {
            description.append(" - ").append(purpose);
        }

        if (isRecurring != null && isRecurring && recurringFrequency != null) {
            description.append(" (").append(recurringFrequency).append(" recurring)");
        }

        return description.toString();
    }

    public String getStandardTaxStatement() {
        return "This receipt acknowledges that you made a charitable contribution to " + churchName +
               ". No goods or services were provided in exchange for this donation. " +
               "Please consult your tax advisor regarding the deductibility of this contribution.";
    }

    public String getReceiptFooter() {
        return "Thank you for your generous support! Your contribution helps us continue our mission " +
               "and serve our community. If you have any questions about this receipt, please contact us.";
    }
}