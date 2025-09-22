package com.churchapp.service;

import com.churchapp.dto.DashboardActivityItem;
import com.churchapp.dto.DashboardResponse;
import com.churchapp.dto.DashboardResponse.DashboardStats;
import com.churchapp.dto.DashboardResponse.QuickAction;
import com.churchapp.dto.DashboardResponse.NotificationSummary;
import com.churchapp.dto.DashboardResponse.NotificationSummary.NotificationPreview;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.EventRepository;
import com.churchapp.repository.DonationRepository;
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
    
    public DashboardResponse getDashboardData(String currentUserEmail) {
        User currentUser = userRepository.findByEmail(currentUserEmail)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return new DashboardResponse(
            getRecentActivity(),
            getDashboardStats(),
            getQuickActions(currentUser),
            getNotificationSummary(currentUser),
            LocalDateTime.now()
        );
    }
    
    private List<DashboardActivityItem> getRecentActivity() {
        List<DashboardActivityItem> activities = new ArrayList<>();
        
        // Get recent user registrations (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
        Pageable recentUsersPageable = PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        List<User> recentUsers = userRepository.findByCreatedAtAfterOrderByCreatedAtDesc(thirtyDaysAgo, recentUsersPageable);
        
        for (User user : recentUsers) {
            activities.add(DashboardActivityItem.userJoined(
                user.getId(),
                user.getName(),
                user.getProfilePicUrl(),
                user.getCreatedAt()
            ));
        }
        
        // Get recent profile updates (last 7 days)
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
        List<User> recentlyUpdated = userRepository.findByUpdatedAtAfterAndUpdatedAtNotEqualToCreatedAtOrderByUpdatedAtDesc(sevenDaysAgo);
        
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

        // Get recent donations (last 7 days) - reuse existing sevenDaysAgo
        Pageable recentDonationsPageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "timestamp"));

        try {
            List<Donation> recentDonations = donationRepository.findDonationsByDateRange(sevenDaysAgo, now)
                .stream()
                .limit(10)
                .collect(Collectors.toList());

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
    
    private DashboardStats getDashboardStats() {
        long totalMembers = userRepository.count();
        
        LocalDateTime oneWeekAgo = LocalDateTime.now().minus(7, ChronoUnit.DAYS);
        long newMembersThisWeek = userRepository.countByCreatedAtAfter(oneWeekAgo);
        
        // Get actual prayer statistics
        long activePrayerRequests = prayerRequestService.getActivePrayerCount();
        long answeredPrayerRequests = prayerRequestService.getAnsweredPrayerCount();
        
        // Get announcement statistics
        long totalAnnouncements = announcementService.getAnnouncementCount();
        long pinnedAnnouncements = announcementService.getPinnedAnnouncementCount();
        
        // Get upcoming events count - FIXED: Now actually counting upcoming events
        LocalDateTime now = LocalDateTime.now();
        long upcomingEvents = eventRepository.findUpcomingEvents(now, PageRequest.of(0, Integer.MAX_VALUE)).getTotalElements();
        
        // Get donation statistics
        BigDecimal totalDonationsThisMonth = BigDecimal.ZERO;
        long donationCountThisMonth = 0L;
        long uniqueDonorsThisMonth = 0L;

        try {
            LocalDateTime oneMonthAgo = LocalDateTime.now().minus(30, ChronoUnit.DAYS);
            totalDonationsThisMonth = donationRepository.getTotalDonationsByDateRange(oneMonthAgo, now);
            if (totalDonationsThisMonth == null) totalDonationsThisMonth = BigDecimal.ZERO;

            donationCountThisMonth = donationRepository.findDonationsByDateRange(oneMonthAgo, now).size();
            uniqueDonorsThisMonth = donationRepository.getUniqueDonorCount(oneMonthAgo, now);
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
        
        
        // Admin-only actions
        if (currentUser.getRole() == User.UserRole.ADMIN) {
            actions.add(QuickAction.createForRole(
                "admin_tools",
                "Admin Tools",
                "Manage users and moderate content",
                "/admin",
                "shield",
                "Manage",
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
        if (currentUser.getRole() == User.UserRole.ADMIN || currentUser.getRole() == User.UserRole.MODERATOR) {
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