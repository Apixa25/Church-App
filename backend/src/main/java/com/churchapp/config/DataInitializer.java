package com.churchapp.config;

import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.ChatGroupMember;
import com.churchapp.entity.User;
import com.churchapp.repository.ChatGroupRepository;
import com.churchapp.repository.ChatGroupMemberRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

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
    
    @Override
    @Transactional
    public void run(String... args) throws Exception {
        initializeDefaultChatGroups();
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
            .filter(user -> user.getRole() == User.UserRole.ADMIN)
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
}
