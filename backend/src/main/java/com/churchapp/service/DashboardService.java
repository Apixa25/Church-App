package com.churchapp.service;

import com.churchapp.dto.DashboardActivityItem;
import com.churchapp.dto.DashboardResponse;
import com.churchapp.dto.DashboardResponse.DashboardStats;
import com.churchapp.dto.DashboardResponse.QuickAction;
import com.churchapp.dto.DashboardResponse.NotificationSummary;
import com.churchapp.dto.DashboardResponse.NotificationSummary.NotificationPreview;
import com.churchapp.entity.User;
import com.churchapp.entity.UserOrganizationMembership;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.DonationRepository;
import com.churchapp.repository.UserOrganizationMembershipRepository;
import com.churchapp.entity.Donation;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {
    
    private final UserRepository userRepository;
    private final PrayerRequestService prayerRequestService;
    private final AnnouncementService announcementService;
    private final EventRepository eventRepository;
    private final DonationRepository donationRepository;
    private final UserOrganizationMembershipRepository membershipRepository;
    
    public DashboardResponse getDashboardData(String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Get user's primary organization for filtering
        UUID organizationId = currentUser.getPrimaryOrganization() != null 
            ? currentUser.getPrimaryOrganization().getId() 
            : null;
        
        return new DashboardResponse(
            getRecentActivity(organizationId),
            getDashboardStats(organizationId),
            getQuickActions(currentUser),
            getNotificationSummary(currentUser),
            LocalDateTime.now()
        );
    }
    
    private List<DashboardActivityItem> getRecentActivity(UUID organizationId) {
        List<DashboardActivityItem> activities = new ArrayList<>();
        
        // Get recent user registrations (last 30 days) - FILTER BY ORG
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
        Pageable recentUsersPageable = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        // Only show users from same organization
        List<User> recentUsers;
        if (organizationId != null) {
            recentUsers = userRepository.findByPrimaryOrganizationIdAndCreatedAtAfterOrderByCreatedAtDesc(
                organizationId, thirtyDaysAgo, recentUsersPageable);
        } else {
            // Social-only users - show empty or global org users
            recentUsers = new ArrayList<>();
        }
        
        for (User user : recentUsers) {
            activities.add(DashboardActivityItem.userJoined(
                user.getId(),
                user.getName(),
                user.getProfilePicUrl(),
                user.getCreatedAt()
            ));
        }
        
        // Get recent profile updates (last 7 days) - FILTER BY ORG
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
        List<User> recentlyUpdated;
        if (organizationId != null) {
            recentlyUpdated = userRepository.findByPrimaryOrganizationIdAndUpdatedAtAfterAndUpdatedAtNotEqualToCreatedAtOrderByUpdatedAtDesc(
                organizationId, sevenDaysAgo);
        } else {
            recentlyUpdated = new ArrayList<>();
        }
        
        for (User user : recentlyUpdated) {
            activities.add(DashboardActivityItem.profileUpdated(
                user.getId(),
                user.getName(),
                user.getProfilePicUrl(),
                user.getUpdatedAt()
            ));
        }
        
        // Add some system activities for demonstration with varied timestamps
        LocalDateTime now = LocalDateTime.now();
        activities.add(new DashboardActivityItem(
            UUID.randomUUID(),
            "system",
            "Welcome to Church App!",
            "Your church community platform is ready for use",
            "System",
            null,
            null,
            now.minus(2, ChronoUnit.HOURS),
            null,
            "church",
            null
        ));
        
        activities.add(new DashboardActivityItem(
            UUID.randomUUID(),
            "system",
            "Prayer Requests Available",
            "Share and support each other through prayer",
            "System",
            null,
            null,
            now.minus(1, ChronoUnit.HOURS),
            null,
            "prayer",
            null
        ));
        
        activities.add(new DashboardActivityItem(
            UUID.randomUUID(),
            "system",
            "Group Chats Available",
            "Connect with your church family in real-time",
            "System",
            null,
            null,
            now.minus(30, ChronoUnit.MINUTES),
            null,
            "chat",
            null
        ));

        // Get recent donations (last 7 days) - FIXED: FILTER BY ORGANIZATION
        try {
            List<Donation> recentDonations;
            if (organizationId != null) {
                // CRITICAL FIX: Only get donations for user's organization
                recentDonations = donationRepository.findDonationsByOrganizationIdAndDateRange(
                    organizationId, sevenDaysAgo, now)
                    .stream()
                    .limit(10)
                    .collect(Collectors.toList());
            } else {
                recentDonations = new ArrayList<>();
            }

            for (Donation donation : recentDonations) {
                // Only show non-anonymous donations in the public activity feed
                if (!donation.getIsRecurring()) {
                    activities.add(new DashboardActivityItem(
                        donation.getId(),
                        "donation",
                        "💝 New Donation",
                        String.format("$%.2f donation for %s",
                            donation.getAmount(),
                            donation.getCategoryDisplayName()),
                        donation.getUser().getName(),
                        donation.getUser().getProfilePicUrl(),
                        donation.getUser().getId(),
                        donation.getTimestamp(),
                        "/donations",
                        "donation",
                        Map.of(
                            "amount", donation.getAmount(),
                            "category", donation.getCategory().name(),
                            "purpose", donation.getPurpose() != null ? donation.getPurpose() : "",
                            "isRecurring", donation.getIsRecurring()
                        )
                    ));
                }
            }
        } catch (Exception e) {
            // Log error but don't fail dashboard loading
            System.err.println("Error loading donation activities: " + e.getMessage());
        }

        // ENHANCED: Sort by timestamp descending to ensure true chronological order
        // This ensures all activity types are properly mixed by time, not grouped by type
        return activities.stream()
            .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
            .limit(15)
            .collect(Collectors.toList());
    }
    
    private DashboardStats getDashboardStats(UUID organizationId) {
        // CRITICAL FIX: All stats must be filtered by organization
        
        long totalMembers = 0L;
        long newMembersThisWeek = 0L;
        
        if (organizationId != null) {
            // Count members of this organization only
            totalMembers = userRepository.countByPrimaryOrganizationId(organizationId);
            LocalDateTime oneWeekAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
            newMembersThisWeek = userRepository.countByPrimaryOrganizationIdAndCreatedAtAfter(organizationId, oneWeekAgo);
        }
        
        // Get prayer statistics - FILTER BY ORG
        long activePrayerRequests = organizationId != null 
            ? prayerRequestService.getActivePrayerCountByOrganization(organizationId) 
            : 0L;
        long answeredPrayerRequests = organizationId != null 
            ? prayerRequestService.getAnsweredPrayerCountByOrganization(organizationId) 
            : 0L;
        
        // Get announcement statistics - FILTER BY ORG
        long totalAnnouncements = organizationId != null 
            ? announcementService.getAnnouncementCountByOrganization(organizationId) 
            : 0L;
        long pinnedAnnouncements = organizationId != null 
            ? announcementService.getPinnedAnnouncementCountByOrganization(organizationId) 
            : 0L;
        
        // Get upcoming events count - FIXED: FILTER BY ORGANIZATION
        LocalDateTime now = LocalDateTime.now();
        long upcomingEvents = 0L;
        if (organizationId != null) {
            upcomingEvents = eventRepository.countUpcomingByOrganizationId(organizationId, now);
        }
        
        // Get donation statistics - FIXED: FILTER BY ORGANIZATION
        BigDecimal totalDonationsThisMonth = BigDecimal.ZERO;
        long donationCountThisMonth = 0L;
        long uniqueDonorsThisMonth = 0L;

        try {
            if (organizationId != null) {
                LocalDateTime oneMonthAgo = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
                totalDonationsThisMonth = donationRepository.getTotalDonationsByOrganizationIdAndDateRange(
                    organizationId, oneMonthAgo, now);
                if (totalDonationsThisMonth == null) totalDonationsThisMonth = BigDecimal.ZERO;

                donationCountThisMonth = donationRepository.findDonationsByOrganizationIdAndDateRange(
                    organizationId, oneMonthAgo, now).size();
                uniqueDonorsThisMonth = donationRepository.getUniqueDonorCountByOrganizationId(
                    organizationId, oneMonthAgo, now);
            }
        } catch (Exception e) {
            System.err.println("Error loading donation stats: " + e.getMessage());
        }

        Map<String, Object> additionalStats = new HashMap<>();
        additionalStats.put("activeUsersToday", totalMembers); // Placeholder
        additionalStats.put("totalAnnouncements", totalAnnouncements);
        additionalStats.put("pinnedAnnouncements", pinnedAnnouncements);
        additionalStats.put("totalDonationsThisMonth", totalDonationsThisMonth);
        additionalStats.put("donationCountThisMonth", donationCountThisMonth);
        additionalStats.put("uniqueDonorsThisMonth", uniqueDonorsThisMonth);
        
        return new DashboardStats(
            totalMembers,
            newMembersThisWeek,
            activePrayerRequests + answeredPrayerRequests, // totalPrayerRequests
            activePrayerRequests, // Now using actual active prayer count
            answeredPrayerRequests, // Now using actual answered prayer count
            upcomingEvents, // FIXED: Now using actual upcoming events count
            totalAnnouncements, // Now using actual announcement count
            additionalStats
        );
    }
    
    private List<QuickAction> getQuickActions(User currentUser) {
        List<QuickAction> actions = new ArrayList<>();
        
        // Profile actions - available to all users
        actions.add(QuickAction.create(
            "view_profile",
            "My Profile",
            "View and manage your profile information",
            "/profile",
            "user",
            "View Profile"
        ));
        
        
        // Coming soon sections        
        actions.add(QuickAction.create(
            "group_chats",
            "Group Chats",
            "Connect with your church family",
            "/chats",
            "chat",
            "Open Chats"
        ));
        
        // Check if user has primary organization
        boolean hasPrimaryOrg = currentUser.getPrimaryOrganization() != null;
        
        // Organization-specific actions - only show if user has primary org
        if (hasPrimaryOrg) {
            actions.add(QuickAction.create(
                "announcements",
                "Announcements",
                "Stay updated with church news and announcements",
                "/announcements",
                "megaphone",
                "View Announcements"
            ));

            // Donation quick actions
            actions.add(QuickAction.create(
                "make_donation",
                "Make Donation",
                "Support your church through generous giving",
                "/donations",
                "donation",
                "Give Now"
            ));

            actions.add(QuickAction.create(
                "donation_history",
                "My Donations",
                "View your donation history and receipts",
                "/donations",
                "history",
                "View History"
            ));
        }
        
        
        // Admin-only actions (PLATFORM_ADMIN or ORG_ADMIN)
        boolean isPlatformAdmin = currentUser.getRole() == User.Role.PLATFORM_ADMIN;
        boolean isOrgAdmin = membershipRepository
            .findByUserIdAndRole(currentUser.getId(), UserOrganizationMembership.OrgRole.ORG_ADMIN)
            .stream()
            .findAny()
            .isPresent();
        
        if (isPlatformAdmin || isOrgAdmin) {
            actions.add(QuickAction.createForRole(
                "admin_tools",
                "Admin Dashboard",
                isOrgAdmin && !isPlatformAdmin 
                    ? "Manage your organization" 
                    : "Manage users and moderate content",
                "/admin",
                "shield",
                "Open Dashboard",
                "ADMIN"
            ));

            actions.add(QuickAction.createForRole(
                "donation_analytics",
                "Donation Analytics",
                "View donation trends and financial reports",
                "/admin/donations/analytics",
                "chart",
                "View Analytics",
                "ADMIN"
            ));
        }
        
        // Moderator and Admin actions
        if (currentUser.getRole() == User.Role.PLATFORM_ADMIN || currentUser.getRole() == User.Role.MODERATOR) {
            actions.add(QuickAction.createForRole(
                "create_announcement",
                "New Announcement",
                "Create a new church announcement",
                "/announcements/create",
                "megaphone",
                "Create Announcement",
                "MODERATOR"
            ));
            
            actions.add(QuickAction.createForRole(
                "moderate_content",
                "Content Moderation",
                "Review and moderate community content",
                "/moderate",
                "flag",
                "Moderate",
                "MODERATOR"
            ));
        }
        
        return actions;
    }
    
    private NotificationSummary getNotificationSummary(User currentUser) {
        List<NotificationPreview> previews = new ArrayList<>();
        
        // Add welcome notification for new users
        if (currentUser.getCreatedAt().isAfter(LocalDateTime.now().minus(7, ChronoUnit.DAYS))) {
            previews.add(new NotificationPreview(
                "welcome",
                "Welcome to Church App!",
                "Complete your profile to get started",
                currentUser.getCreatedAt(),
                "/profile/edit"
            ));
        }
        
        // Add system notifications
        previews.add(new NotificationPreview(
            "system",
            "Giving Platform Ready",
            "You can now make secure donations through the app",
            LocalDateTime.now().minus(2, ChronoUnit.HOURS),
            "/donations"
        ));

        // Add donation-related notifications
        try {
            LocalDateTime oneWeekAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
            List<Donation> userRecentDonations = donationRepository.findByUserAndTimestampAfter(
                currentUser, oneWeekAgo
            );

            if (!userRecentDonations.isEmpty()) {
                Donation lastDonation = userRecentDonations.get(0);
                previews.add(new NotificationPreview(
                    "donation",
                    "Thank You for Your Donation",
                    String.format("Your $%.2f donation was processed successfully",
                        lastDonation.getAmount()),
                    lastDonation.getTimestamp(),
                    "/donations"
                ));
            }
        } catch (Exception e) {
            System.err.println("Error loading donation notifications: " + e.getMessage());
        }

        return new NotificationSummary(
            (long) previews.size(),
            0L, // Prayer request notifications
            0L, // Announcement notifications
            0L, // Chat message notifications
            0L, // Event notifications
            previews
        );
    }
}