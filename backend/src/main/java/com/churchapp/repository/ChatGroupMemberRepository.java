package com.churchapp.repository;

import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.ChatGroupMember;
import com.churchapp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatGroupMemberRepository extends JpaRepository<ChatGroupMember, UUID> {
    
    // Find member by user and group
    Optional<ChatGroupMember> findByUserAndChatGroup(User user, ChatGroup chatGroup);
    
    // Find active member by user and group
    Optional<ChatGroupMember> findByUserAndChatGroupAndIsActiveTrue(User user, ChatGroup chatGroup);
    
    // Check if user is member of group
    boolean existsByUserAndChatGroupAndIsActiveTrue(User user, ChatGroup chatGroup);
    
    // Find all members of a group
    List<ChatGroupMember> findByChatGroupAndIsActiveTrueOrderByJoinedAtAsc(ChatGroup chatGroup);
    
    // Find all members of a group with pagination
    Page<ChatGroupMember> findByChatGroupAndIsActiveTrueOrderByJoinedAtAsc(ChatGroup chatGroup, Pageable pageable);
    
    // Find members by role
    List<ChatGroupMember> findByChatGroupAndMemberRoleAndIsActiveTrue(
        ChatGroup chatGroup, ChatGroupMember.MemberRole role);
    
    // Find all groups for a user
    List<ChatGroupMember> findByUserAndIsActiveTrueOrderByJoinedAtDesc(User user);
    
    // Count active members in group
    @Query("SELECT COUNT(cgm) FROM ChatGroupMember cgm WHERE cgm.chatGroup = :chatGroup AND cgm.isActive = true")
    long countActiveMembersByChatGroup(@Param("chatGroup") ChatGroup chatGroup);
    
    // Find members with unread messages
    @Query("SELECT cgm FROM ChatGroupMember cgm WHERE cgm.chatGroup = :chatGroup AND cgm.isActive = true AND " +
           "(cgm.lastReadAt IS NULL OR cgm.lastReadAt < (SELECT MAX(m.timestamp) FROM Message m WHERE m.chatGroup = :chatGroup))")
    List<ChatGroupMember> findMembersWithUnreadMessages(@Param("chatGroup") ChatGroup chatGroup);
    
    // Find members who haven't read since a specific time
    @Query("SELECT cgm FROM ChatGroupMember cgm WHERE cgm.chatGroup = :chatGroup AND cgm.isActive = true AND " +
           "(cgm.lastReadAt IS NULL OR cgm.lastReadAt < :since)")
    List<ChatGroupMember> findMembersWhoHaventReadSince(@Param("chatGroup") ChatGroup chatGroup, @Param("since") LocalDateTime since);
    
    // Find admins and moderators
    @Query("SELECT cgm FROM ChatGroupMember cgm WHERE cgm.chatGroup = :chatGroup AND cgm.isActive = true AND " +
           "cgm.memberRole IN ('OWNER', 'ADMIN', 'MODERATOR')")
    List<ChatGroupMember> findModeratorsAndAdmins(@Param("chatGroup") ChatGroup chatGroup);
    
    // Find online members (recently active)
    @Query("SELECT cgm FROM ChatGroupMember cgm WHERE cgm.chatGroup = :chatGroup AND cgm.isActive = true AND " +
           "cgm.lastReadAt > :since ORDER BY cgm.lastReadAt DESC")
    List<ChatGroupMember> findRecentlyActiveMemembers(@Param("chatGroup") ChatGroup chatGroup, @Param("since") LocalDateTime since);
    
    // Update last read timestamp
    @Modifying
    @Query("UPDATE ChatGroupMember cgm SET cgm.lastReadAt = :timestamp WHERE cgm.user = :user AND cgm.chatGroup = :chatGroup")
    void updateLastReadAt(@Param("user") User user, @Param("chatGroup") ChatGroup chatGroup, @Param("timestamp") LocalDateTime timestamp);
    
    // Remove member from group (set inactive)
    @Modifying
    @Query("UPDATE ChatGroupMember cgm SET cgm.isActive = false, cgm.leftAt = :leftAt WHERE cgm.user = :user AND cgm.chatGroup = :chatGroup")
    void removeMember(@Param("user") User user, @Param("chatGroup") ChatGroup chatGroup, @Param("leftAt") LocalDateTime leftAt);
    
    // Update member role
    @Modifying
    @Query("UPDATE ChatGroupMember cgm SET cgm.memberRole = :role WHERE cgm.user = :user AND cgm.chatGroup = :chatGroup")
    void updateMemberRole(@Param("user") User user, @Param("chatGroup") ChatGroup chatGroup, @Param("role") ChatGroupMember.MemberRole role);
    
    // Mute/unmute member
    @Modifying
    @Query("UPDATE ChatGroupMember cgm SET cgm.isMuted = :isMuted WHERE cgm.user = :user AND cgm.chatGroup = :chatGroup")
    void updateMuteStatus(@Param("user") User user, @Param("chatGroup") ChatGroup chatGroup, @Param("isMuted") boolean isMuted);
    
    // Enable/disable notifications
    @Modifying
    @Query("UPDATE ChatGroupMember cgm SET cgm.notificationsEnabled = :enabled WHERE cgm.user = :user AND cgm.chatGroup = :chatGroup")
    void updateNotificationSettings(@Param("user") User user, @Param("chatGroup") ChatGroup chatGroup, @Param("enabled") boolean enabled);
    
    // Statistics queries
    @Query("SELECT COUNT(cgm) FROM ChatGroupMember cgm WHERE cgm.joinedAt > :since")
    long countMembersJoinedSince(@Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(DISTINCT cgm.user) FROM ChatGroupMember cgm WHERE cgm.isActive = true")
    long countUniqueActiveMembers();
    
    // Find most active members (by group count)
    @Query("SELECT cgm.user, COUNT(cgm) as groupCount FROM ChatGroupMember cgm WHERE cgm.isActive = true " +
           "GROUP BY cgm.user ORDER BY COUNT(cgm) DESC")
    List<Object[]> findMostActiveMembers(Pageable pageable);
}