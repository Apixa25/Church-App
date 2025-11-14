package com.churchapp.controller;

import com.churchapp.entity.Organization;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.model.LoginLink;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.stripe.param.LoginLinkCreateOnAccountParams;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/stripe-connect")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class StripeConnectController {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final UserOrganizationMembershipRepository membershipRepository;

    @Value("${stripe.secret.key}")
    private String stripeApiKey;

    @Value("${app.base.url:http://localhost:3000}")
    private String appBaseUrl;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    private boolean isUserAdminOfOrganization(User user, UUID organizationId) {
        return membershipRepository.findByUserIdAndOrganizationId(user.getId(), organizationId)
                .map(membership -> membership.getRole() == UserOrganizationMembership.OrgRole.ADMIN)
                .orElse(false);
    }

    /**
     * Create a Stripe Connect account for an organization
     * Only organization admins can do this
     */
    @PostMapping("/create-account/{organizationId}")
    public ResponseEntity<?> createConnectAccount(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User user
    ) {
        try {
            // Get the current user
            User currentUser = userRepository.findByEmail(user.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get the organization
            Organization organization = organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new RuntimeException("Organization not found"));

            // Check if user is admin of this organization
            if (!isUserAdminOfOrganization(currentUser, organizationId)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "Only organization administrators can set up Stripe Connect"
                ));
            }

            // Check if organization already has a Stripe account
            if (organization.getStripeConnectAccountId() != null &&
                !organization.getStripeConnectAccountId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "This organization already has a Stripe Connect account",
                    "accountId", organization.getStripeConnectAccountId()
                ));
            }

            // Get website URL from settings if available
            String websiteUrl = null;
            if (organization.getSettings() != null && organization.getSettings().containsKey("website")) {
                Object websiteObj = organization.getSettings().get("website");
                if (websiteObj instanceof String) {
                    websiteUrl = (String) websiteObj;
                }
            }

            // Create Stripe Connect account
            AccountCreateParams.Builder paramsBuilder = AccountCreateParams.builder()
                    .setType(AccountCreateParams.Type.EXPRESS)
                    .setCountry("US")
                    .setEmail(user.getUsername())
                    .setBusinessType(AccountCreateParams.BusinessType.NON_PROFIT)
                    .setCapabilities(
                        AccountCreateParams.Capabilities.builder()
                            .setCardPayments(
                                AccountCreateParams.Capabilities.CardPayments.builder()
                                    .setRequested(true)
                                    .build()
                            )
                            .setTransfers(
                                AccountCreateParams.Capabilities.Transfers.builder()
                                    .setRequested(true)
                                    .build()
                            )
                            .build()
                    );

            // Build business profile
            AccountCreateParams.BusinessProfile.Builder profileBuilder =
                AccountCreateParams.BusinessProfile.builder()
                    .setName(organization.getName())
                    .setProductDescription("Religious organization accepting donations");

            if (websiteUrl != null && !websiteUrl.trim().isEmpty()) {
                profileBuilder.setUrl(websiteUrl);
            }

            paramsBuilder.setBusinessProfile(profileBuilder.build());

            Account account = Account.create(paramsBuilder.build());

            // Save the account ID to the organization
            organization.setStripeConnectAccountId(account.getId());
            organizationRepository.save(organization);

            // Create account link for onboarding
            AccountLinkCreateParams linkParams = AccountLinkCreateParams.builder()
                    .setAccount(account.getId())
                    .setRefreshUrl(appBaseUrl + "/organization/" + organizationId + "/stripe-connect?refresh=true")
                    .setReturnUrl(appBaseUrl + "/organization/" + organizationId + "/stripe-connect?success=true")
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build();

            AccountLink accountLink = AccountLink.create(linkParams);

            Map<String, Object> response = new HashMap<>();
            response.put("accountId", account.getId());
            response.put("onboardingUrl", accountLink.getUrl());
            response.put("expiresAt", accountLink.getExpiresAt());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to create Stripe Connect account: " + e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "An error occurred: " + e.getMessage()
            ));
        }
    }

    /**
     * Get Stripe Connect account status for an organization
     */
    @GetMapping("/account-status/{organizationId}")
    public ResponseEntity<?> getAccountStatus(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User user
    ) {
        try {
            // Get the organization
            Organization organization = organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new RuntimeException("Organization not found"));

            // Check if organization has a Stripe account
            if (organization.getStripeConnectAccountId() == null ||
                organization.getStripeConnectAccountId().trim().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "hasAccount", false,
                    "chargesEnabled", false,
                    "detailsSubmitted", false
                ));
            }

            // Retrieve account from Stripe
            Account account = Account.retrieve(organization.getStripeConnectAccountId());

            Map<String, Object> response = new HashMap<>();
            response.put("hasAccount", true);
            response.put("accountId", account.getId());
            response.put("chargesEnabled", account.getChargesEnabled());
            response.put("detailsSubmitted", account.getDetailsSubmitted());
            response.put("payoutsEnabled", account.getPayoutsEnabled());
            response.put("country", account.getCountry());
            response.put("defaultCurrency", account.getDefaultCurrency());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to retrieve Stripe account status: " + e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "An error occurred: " + e.getMessage()
            ));
        }
    }

    /**
     * Create a new account link for re-onboarding
     * Used when the user needs to complete onboarding or update account details
     */
    @PostMapping("/create-account-link/{organizationId}")
    public ResponseEntity<?> createAccountLink(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User user
    ) {
        try {
            // Get the current user
            User currentUser = userRepository.findByEmail(user.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get the organization
            Organization organization = organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new RuntimeException("Organization not found"));

            // Check if user is admin of this organization
            if (!isUserAdminOfOrganization(currentUser, organizationId)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "Only organization administrators can manage Stripe Connect"
                ));
            }

            // Check if organization has a Stripe account
            if (organization.getStripeConnectAccountId() == null ||
                organization.getStripeConnectAccountId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Organization does not have a Stripe Connect account"
                ));
            }

            // Create account link for onboarding
            AccountLinkCreateParams linkParams = AccountLinkCreateParams.builder()
                    .setAccount(organization.getStripeConnectAccountId())
                    .setRefreshUrl(appBaseUrl + "/organization/" + organizationId + "/stripe-connect?refresh=true")
                    .setReturnUrl(appBaseUrl + "/organization/" + organizationId + "/stripe-connect?success=true")
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build();

            AccountLink accountLink = AccountLink.create(linkParams);

            Map<String, Object> response = new HashMap<>();
            response.put("onboardingUrl", accountLink.getUrl());
            response.put("expiresAt", accountLink.getExpiresAt());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to create account link: " + e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "An error occurred: " + e.getMessage()
            ));
        }
    }

    /**
     * Create a login link for the Stripe Express dashboard
     */
    @PostMapping("/create-dashboard-link/{organizationId}")
    public ResponseEntity<?> createDashboardLink(
            @PathVariable UUID organizationId,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User user
    ) {
        try {
            // Get the current user
            User currentUser = userRepository.findByEmail(user.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get the organization
            Organization organization = organizationRepository.findById(organizationId)
                    .orElseThrow(() -> new RuntimeException("Organization not found"));

            // Check if user is admin of this organization
            if (!isUserAdminOfOrganization(currentUser, organizationId)) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "Only organization administrators can access the dashboard"
                ));
            }

            // Check if organization has a Stripe account
            if (organization.getStripeConnectAccountId() == null ||
                organization.getStripeConnectAccountId().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Organization does not have a Stripe Connect account"
                ));
            }

            // Create login link using the correct API
            LoginLinkCreateOnAccountParams params = LoginLinkCreateOnAccountParams.builder().build();
            LoginLink loginLink = LoginLink.createOnAccount(
                organization.getStripeConnectAccountId(),
                params,
                null
            );

            Map<String, Object> response = new HashMap<>();
            response.put("dashboardUrl", loginLink.getUrl());

            return ResponseEntity.ok(response);

        } catch (StripeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to create dashboard link: " + e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "An error occurred: " + e.getMessage()
            ));
        }
    }
}
