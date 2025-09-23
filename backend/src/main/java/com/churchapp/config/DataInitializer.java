package com.churchapp.config;

import com.churchapp.entity.Announcement;
import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.ChatGroupMember;
import com.churchapp.entity.User;
import com.churchapp.repository.AnnouncementRepository;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import java.util.List;

/**
 * Data initializer to create default chat groups for the church community
 */
@Component
@Order(1000) // Run after other initializers
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final UserRepository userRepository;
    private final AnnouncementRepository announcementRepository;
    
    @Override
    @Transactional
    public void run(String... args) throws Exception {
        initializeDefaultUsers();
        initializeDefaultChatGroups();
        initializeSampleAnnouncements();
    }
    
    private void initializeDefaultUsers() {
        log.info("Initializing default users...");
        
        // Check if admin user already exists
        List<User> allUsers = userRepository.findAllActiveUsers();
        boolean adminExists = allUsers.stream()
            .anyMatch(user -> user.getRole() == User.Role.ADMIN);
        
        if (adminExists) {
            log.info("Admin user already exists, skipping admin user initialization");
        } else {
            log.info("No admin user found, creating default admin user");
            createDefaultAdminUser();
        }
        
        // Only create member user if no users exist at all
        if (userRepository.count() == 0) {
            log.info("No users found, creating default member user");
            createDefaultMemberUser();
        }
    }
    
    private void createDefaultAdminUser() {
        // Create default admin user
        User adminUser = new User();
        adminUser.setEmail("admin@church.local");
        adminUser.setName("Church Administrator");
        adminUser.setRole(User.Role.ADMIN);
        adminUser.setIsActive(true);
        adminUser.setBio("Default church administrator account");
        adminUser.setCreatedAt(LocalDateTime.now());
        adminUser.setUpdatedAt(LocalDateTime.now());
        
        User savedAdmin = userRepository.save(adminUser);
        log.info("Created default admin user: {}", savedAdmin.getEmail());
    }
    
    private void createDefaultMemberUser() {
        // Create default member user for testing
        User memberUser = new User();
        memberUser.setEmail("member@church.local");
        memberUser.setName("John Doe");
        memberUser.setRole(User.Role.MEMBER);
        memberUser.setIsActive(true);
        memberUser.setBio("Sample church member account");
        memberUser.setCreatedAt(LocalDateTime.now());
        memberUser.setUpdatedAt(LocalDateTime.now());
        
        User savedMember = userRepository.save(memberUser);
        log.info("Created default member user: {}", savedMember.getEmail());
    }
    
    private void initializeDefaultChatGroups() {
        log.info("Initializing default chat groups...");
        
        // Check if chat groups already exist
        if (chatGroupRepository.count() > 0) {
            log.info("Chat groups already exist, skipping initialization");
            return;
        }
        
        // Get any active user as the creator (preferably admin if available)
        List<User> allUsers = userRepository.findAllActiveUsers();
        User creator = allUsers.stream()
            .filter(user -> user.getRole() == User.Role.ADMIN)
            .findFirst()
            .orElse(allUsers.stream().findFirst().orElse(null));
        
        if (creator == null) {
            log.warn("No users found, cannot create default chat groups");
            return;
        }
        
        // Create default chat groups
        List<ChatGroupInfo> defaultGroups = List.of(
            new ChatGroupInfo("General Chat", ChatGroup.GroupType.MAIN, 
                "Welcome to our church community! This is the main chat for general discussions.", false),
            new ChatGroupInfo("Prayer Requests", ChatGroup.GroupType.PRAYER, 
                "Share your prayer requests and pray for others in our community.", false),
            new ChatGroupInfo("Bible Study", ChatGroup.GroupType.STUDY, 
                "Discuss scripture, share insights, and grow together in God's word.", false),
            new ChatGroupInfo("Announcements", ChatGroup.GroupType.ANNOUNCEMENT, 
                "Important church announcements and updates.", false),
            new ChatGroupInfo("Youth Group", ChatGroup.GroupType.YOUTH, 
                "A place for our young people to connect and share.", false)
        );
        
        for (ChatGroupInfo groupInfo : defaultGroups) {
            ChatGroup chatGroup = createChatGroup(creator, groupInfo);
            log.info("Created default chat group: {}", chatGroup.getName());
        }
        
        log.info("Default chat groups initialization completed");
    }
    
    private ChatGroup createChatGroup(User creator, ChatGroupInfo groupInfo) {
        ChatGroup chatGroup = new ChatGroup();
        chatGroup.setName(groupInfo.name);
        chatGroup.setType(groupInfo.type);
        chatGroup.setDescription(groupInfo.description);
        chatGroup.setCreatedBy(creator);
        chatGroup.setIsPrivate(groupInfo.isPrivate);
        chatGroup.setIsActive(true);
        
        chatGroup = chatGroupRepository.save(chatGroup);
        
        // Add creator as owner
        ChatGroupMember creatorMember = new ChatGroupMember();
        creatorMember.setUser(creator);
        creatorMember.setChatGroup(chatGroup);
        creatorMember.setMemberRole(ChatGroupMember.MemberRole.OWNER);
        creatorMember.setIsActive(true);
        chatGroupMemberRepository.save(creatorMember);
        
        return chatGroup;
    }
    
    private record ChatGroupInfo(String name, ChatGroup.GroupType type, String description, boolean isPrivate) {}
    
    private void initializeSampleAnnouncements() {
        log.info("Initializing sample announcements...");
        
        // Check if announcements already exist
        if (announcementRepository.count() > 0) {
            log.info("Announcements already exist, skipping initialization");
            return;
        }
        
        // Get admin user to create announcements
        List<User> allUsers = userRepository.findAllActiveUsers();
        User admin = allUsers.stream()
            .filter(user -> user.getRole() == User.Role.ADMIN)
            .findFirst()
            .orElse(null);
            
        if (admin == null) {
            log.warn("No admin user found, skipping announcement initialization");
            return;
        }
        
        // Create sample announcements
        createSampleAnnouncement(admin, "Welcome to Our Church Community! 🏛️",
            "We're excited to have you join our digital church family! This app will help you stay connected with our community, receive important updates, and participate in church activities. Feel free to explore all the features and reach out if you have any questions.",
            Announcement.AnnouncementCategory.GENERAL, true);
            
        createSampleAnnouncement(admin, "Sunday Service Update ⛪",
            "Join us this Sunday at 10:00 AM for our weekly worship service. We'll be continuing our sermon series on 'Faith in Action' and we're excited to worship together as a community.",
            Announcement.AnnouncementCategory.WORSHIP, false);
            
        createSampleAnnouncement(admin, "Community Potluck Dinner 🍽️",
            "Save the date! Our monthly community potluck dinner is coming up next Friday at 6:00 PM in the fellowship hall. Bring a dish to share and enjoy great food and fellowship with your church family.",
            Announcement.AnnouncementCategory.EVENTS, false);
            
        createSampleAnnouncement(admin, "Youth Group Activities 🎮",
            "Attention youth and parents! Our youth group meets every Wednesday at 7:00 PM. This week we're having a game night with pizza. All middle and high school students are welcome!",
            Announcement.AnnouncementCategory.YOUTH, false);
            
        createSampleAnnouncement(admin, "Prayer Request Guidelines 🙏",
            "We encourage you to share your prayer requests through our app. Please remember that prayer requests can be submitted anonymously if you prefer. Our prayer team reviews and prays over each request.",
            Announcement.AnnouncementCategory.PRAYER, false);
            
        log.info("Successfully initialized sample announcements");
    }
    
    private void createSampleAnnouncement(User creator, String title, String content, 
                                        Announcement.AnnouncementCategory category, boolean pinned) {
        Announcement announcement = new Announcement();
        announcement.setUser(creator);
        announcement.setTitle(title);
        announcement.setContent(content);
        announcement.setCategory(category);
        announcement.setIsPinned(pinned);
        // deletedAt is null by default (not deleted)
        
        announcementRepository.save(announcement);
        log.debug("Created sample announcement: {}", title);
    }
}
