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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

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
        
        Map<String, Object> additionalStats = new HashMap<>();
        additionalStats.put("activeUsersToday", totalMembers); // Placeholder
        additionalStats.put("totalAnnouncements", totalAnnouncements);
        additionalStats.put("pinnedAnnouncements", pinnedAnnouncements);
        
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
        
        actions.add(QuickAction.create(
            "edit_profile",
            "Edit Profile", 
            "Update your profile information and photo",
            "/profile/edit",
            "edit",
            "Edit Profile"
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
            "New Features Coming",
            "Prayer requests and group chats will be available soon",
            LocalDateTime.now().minus(1, ChronoUnit.HOURS),
            "/dashboard"
        ));
        
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