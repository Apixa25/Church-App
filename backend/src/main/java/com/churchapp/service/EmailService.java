package com.churchapp.service;

import com.churchapp.entity.Donation;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    @Value("${church.name}")
    private String churchName;

    @Value("${church.email}")
    private String churchEmail;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private final JavaMailSender mailSender;

    /**
     * Send donation receipt email with PDF attachment
     */
    public void sendReceiptEmail(Donation donation, byte[] receiptPdf, String recipientEmail) {
        try {
            log.info("Sending receipt email for donation {} to {}", donation.getId(), recipientEmail);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            // Set email details
            helper.setFrom(fromEmail, churchName);
            helper.setTo(recipientEmail);
            helper.setSubject(buildReceiptEmailSubject(donation));
            helper.setText(buildReceiptEmailBody(donation), true);

            // Attach PDF receipt
            String filename = String.format("Receipt_%s_%s.pdf",
                donation.getTimestamp().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                donation.getTransactionId());

            helper.addAttachment(filename, new ByteArrayResource(receiptPdf));

            // Send email
            mailSender.send(message);

            log.info("Receipt email sent successfully for donation {} to {}",
                donation.getId(), recipientEmail);

        } catch (Exception e) {
            log.error("Failed to send receipt email for donation {} to {}: {}",
                donation.getId(), recipientEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send receipt email", e);
        }
    }

    /**
     * Send donation confirmation email (without receipt)
     */
    public void sendDonationConfirmationEmail(Donation donation, String recipientEmail) {
        try {
            log.info("Sending donation confirmation email for donation {} to {}",
                donation.getId(), recipientEmail);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(fromEmail, churchName);
            helper.setTo(recipientEmail);
            helper.setSubject(buildConfirmationEmailSubject(donation));
            helper.setText(buildConfirmationEmailBody(donation), true);

            mailSender.send(message);

            log.info("Donation confirmation email sent successfully for donation {} to {}",
                donation.getId(), recipientEmail);

        } catch (Exception e) {
            log.error("Failed to send confirmation email for donation {} to {}: {}",
                donation.getId(), recipientEmail, e.getMessage(), e);
            // Don't throw exception for confirmation emails
        }
    }

    /**
     * Send subscription confirmation email
     */
    public void sendSubscriptionConfirmationEmail(String donorName, String donorEmail,
                                                 String amount, String frequency, String category) {
        try {
            log.info("Sending subscription confirmation email to {}", donorEmail);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(fromEmail, churchName);
            helper.setTo(donorEmail);
            helper.setSubject("Recurring Donation Setup Confirmed - " + churchName);
            helper.setText(buildSubscriptionConfirmationBody(donorName, amount, frequency, category), true);

            mailSender.send(message);

            log.info("Subscription confirmation email sent successfully to {}", donorEmail);

        } catch (Exception e) {
            log.error("Failed to send subscription confirmation email to {}: {}",
                donorEmail, e.getMessage(), e);
        }
    }

    /**
     * Send subscription cancellation email
     */
    public void sendSubscriptionCancellationEmail(String donorName, String donorEmail,
                                                 String amount, String frequency, String category) {
        try {
            log.info("Sending subscription cancellation email to {}", donorEmail);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setFrom(fromEmail, churchName);
            helper.setTo(donorEmail);
            helper.setSubject("Recurring Donation Canceled - " + churchName);
            helper.setText(buildSubscriptionCancellationBody(donorName, amount, frequency, category), true);

            mailSender.send(message);

            log.info("Subscription cancellation email sent successfully to {}", donorEmail);

        } catch (Exception e) {
            log.error("Failed to send subscription cancellation email to {}: {}",
                donorEmail, e.getMessage(), e);
        }
    }

    private String buildReceiptEmailSubject(Donation donation) {
        return String.format("Donation Receipt - %s - %s",
            donation.getFormattedAmount(), churchName);
    }

    private String buildReceiptEmailBody(Donation donation) {
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4682B4;">Thank you for your generous donation!</h2>

                    <p>Dear %s,</p>

                    <p>We have received your donation of <strong>%s</strong> for <strong>%s</strong>
                    on %s. Your generosity makes a significant difference in our ministry and community outreach.</p>

                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4682B4; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Donation Details:</h3>
                        <ul style="margin-bottom: 0;">
                            <li><strong>Amount:</strong> %s</li>
                            <li><strong>Category:</strong> %s</li>
                            <li><strong>Date:</strong> %s</li>
                            <li><strong>Transaction ID:</strong> %s</li>
                            %s
                        </ul>
                    </div>

                    <p><strong>Your official tax-deductible receipt is attached to this email as a PDF.</strong>
                    Please save this receipt for your records as it may be needed for tax purposes.</p>

                    <p>If you have any questions about your donation or this receipt, please don't hesitate to contact us at
                    <a href="mailto:%s">%s</a> or %s.</p>

                    <p>Thank you again for your faithful support and partnership in ministry!</p>

                    <p>Blessings,<br>
                    <strong>%s</strong></p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This is an automated message. Please do not reply to this email.
                        If you need assistance, please contact us directly.
                    </p>
                </div>
            </body>
            </html>
            """,
            donation.getUser().getName(),
            donation.getFormattedAmount(),
            donation.getCategoryDisplayName(),
            donation.getTimestamp().format(DateTimeFormatter.ofPattern("MMMM d, yyyy")),
            donation.getFormattedAmount(),
            donation.getCategoryDisplayName(),
            donation.getTimestamp().format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a")),
            donation.getTransactionId(),
            donation.getPurpose() != null && !donation.getPurpose().trim().isEmpty() ?
                "<li><strong>Purpose:</strong> " + donation.getPurpose() + "</li>" : "",
            churchEmail,
            churchEmail,
            "@value('${church.phone}')",
            churchName
        );
    }

    private String buildConfirmationEmailSubject(Donation donation) {
        return String.format("Donation Confirmation - %s - %s",
            donation.getFormattedAmount(), churchName);
    }

    private String buildConfirmationEmailBody(Donation donation) {
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4682B4;">Donation Received - Thank You!</h2>

                    <p>Dear %s,</p>

                    <p>We want to acknowledge that we have successfully received your donation of <strong>%s</strong>
                    for <strong>%s</strong>. Your contribution is deeply appreciated and will be put to good use
                    in advancing our mission.</p>

                    <p>You will receive a separate email with your official tax receipt within the next few minutes.</p>

                    <p>Thank you for your generosity and continued support!</p>

                    <p>Blessings,<br>
                    <strong>%s</strong></p>
                </div>
            </body>
            </html>
            """,
            donation.getUser().getName(),
            donation.getFormattedAmount(),
            donation.getCategoryDisplayName(),
            churchName
        );
    }

    private String buildSubscriptionConfirmationBody(String donorName, String amount,
                                                   String frequency, String category) {
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4682B4;">Recurring Donation Setup Complete</h2>

                    <p>Dear %s,</p>

                    <p>Thank you for setting up a recurring donation! Your commitment to regular giving
                    makes a tremendous impact on our ministry and allows us to plan for the future with confidence.</p>

                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4682B4; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Recurring Donation Details:</h3>
                        <ul style="margin-bottom: 0;">
                            <li><strong>Amount:</strong> %s</li>
                            <li><strong>Frequency:</strong> %s</li>
                            <li><strong>Category:</strong> %s</li>
                        </ul>
                    </div>

                    <p>You will receive a receipt for each donation as it is processed. You can manage your
                    recurring donations anytime through your account in our church app.</p>

                    <p>Thank you for your faithful generosity!</p>

                    <p>Blessings,<br>
                    <strong>%s</strong></p>
                </div>
            </body>
            </html>
            """,
            donorName, amount, frequency, category, churchName
        );
    }

    private String buildSubscriptionCancellationBody(String donorName, String amount,
                                                   String frequency, String category) {
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4682B4;">Recurring Donation Canceled</h2>

                    <p>Dear %s,</p>

                    <p>We have processed your request to cancel your recurring donation.
                    We want you to know how much we appreciate the support you have provided.</p>

                    <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4682B4; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Canceled Recurring Donation:</h3>
                        <ul style="margin-bottom: 0;">
                            <li><strong>Amount:</strong> %s</li>
                            <li><strong>Frequency:</strong> %s</li>
                            <li><strong>Category:</strong> %s</li>
                        </ul>
                    </div>

                    <p>If you'd like to set up a new recurring donation or make a one-time contribution,
                    you can do so anytime through our church app.</p>

                    <p>Thank you for your past generosity!</p>

                    <p>Blessings,<br>
                    <strong>%s</strong></p>
                </div>
            </body>
            </html>
            """,
            donorName, amount, frequency, category, churchName
        );
    }
}