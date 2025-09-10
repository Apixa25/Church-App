package com.churchapp.repository;

import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.Message;
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
public interface MessageRepository extends JpaRepository<Message, UUID> {
    
    // Find messages in a chat group
    Page<Message> findByChatGroupAndIsDeletedFalseOrderByTimestampDesc(ChatGroup chatGroup, Pageable pageable);
    
    // Find recent messages in a chat group
    List<Message> findTop50ByChatGroupAndIsDeletedFalseOrderByTimestampDesc(ChatGroup chatGroup);
    
    // Find messages since timestamp
    List<Message> findByChatGroupAndTimestampAfterAndIsDeletedFalseOrderByTimestampAsc(
        ChatGroup chatGroup, LocalDateTime since);
    
    // Find messages by user
    Page<Message> findByUserAndIsDeletedFalseOrderByTimestampDesc(User user, Pageable pageable);
    
    // Find messages by user in a specific group
    Page<Message> findByChatGroupAndUserAndIsDeletedFalseOrderByTimestampDesc(
        ChatGroup chatGroup, User user, Pageable pageable);
    
    // Search messages by content
    @Query("SELECT m FROM Message m WHERE m.chatGroup = :chatGroup AND m.isDeleted = false AND " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) ORDER BY m.timestamp DESC")
    List<Message> searchMessagesByContent(@Param("chatGroup") ChatGroup chatGroup, @Param("searchTerm") String searchTerm);
    
    // Search messages across all groups user has access to
    @Query("SELECT m FROM Message m JOIN ChatGroupMember cgm ON m.chatGroup = cgm.chatGroup " +
           "WHERE cgm.user = :user AND cgm.isActive = true AND m.isDeleted = false AND " +
           "LOWER(m.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) ORDER BY m.timestamp DESC")
    List<Message> searchUserAccessibleMessages(@Param("user") User user, @Param("searchTerm") String searchTerm);
    
    // Find replies to a message
    List<Message> findByParentMessageAndIsDeletedFalseOrderByTimestampAsc(Message parentMessage);
    
    // Count replies to a message
    @Query("SELECT COUNT(m) FROM Message m WHERE m.parentMessage = :parentMessage AND m.isDeleted = false")
    long countReplies(@Param("parentMessage") Message parentMessage);
    
    // Find messages by type
    List<Message> findByChatGroupAndMessageTypeAndIsDeletedFalseOrderByTimestampDesc(
        ChatGroup chatGroup, Message.MessageType messageType);
    
    // Find media messages
    @Query("SELECT m FROM Message m WHERE m.chatGroup = :chatGroup AND m.isDeleted = false AND " +
           "m.messageType IN ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT') ORDER BY m.timestamp DESC")
    List<Message> findMediaMessages(@Param("chatGroup") ChatGroup chatGroup);
    
    // Find latest message in group
    Optional<Message> findTopByChatGroupAndIsDeletedFalseOrderByTimestampDesc(ChatGroup chatGroup);
    
    // Find messages with mentions for user
    @Query("SELECT m FROM Message m WHERE m.isDeleted = false AND " +
           "m.mentionedUsers LIKE CONCAT('%', :userId, '%') ORDER BY m.timestamp DESC")
    List<Message> findMessagesWithMentionsForUser(@Param("userId") String userId);
    
    // Count unread messages for user in group
    @Query("SELECT COUNT(m) FROM Message m JOIN ChatGroupMember cgm ON m.chatGroup = cgm.chatGroup " +
           "WHERE cgm.user = :user AND cgm.chatGroup = :chatGroup AND cgm.isActive = true AND " +
           "m.isDeleted = false AND (cgm.lastReadAt IS NULL OR m.timestamp > cgm.lastReadAt)")
    long countUnreadMessagesForUserInGroup(@Param("user") User user, @Param("chatGroup") ChatGroup chatGroup);
    
    // Count total unread messages for user across all groups
    @Query("SELECT COUNT(m) FROM Message m JOIN ChatGroupMember cgm ON m.chatGroup = cgm.chatGroup " +
           "WHERE cgm.user = :user AND cgm.isActive = true AND m.isDeleted = false AND " +
           "(cgm.lastReadAt IS NULL OR m.timestamp > cgm.lastReadAt)")
    long countUnreadMessagesForUser(@Param("user") User user);
    
    // Find messages in date range
    List<Message> findByChatGroupAndTimestampBetweenAndIsDeletedFalseOrderByTimestampAsc(
        ChatGroup chatGroup, LocalDateTime start, LocalDateTime end);
    
    // Statistics queries
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatGroup = :chatGroup AND m.timestamp > :since")
    long countMessagesSince(@Param("chatGroup") ChatGroup chatGroup, @Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.user = :user AND m.timestamp > :since")
    long countUserMessagesSince(@Param("user") User user, @Param("since") LocalDateTime since);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.timestamp > :since")
    long countAllMessagesSince(@Param("since") LocalDateTime since);
    
    // Find most active users in a group
    @Query("SELECT m.user, COUNT(m) as messageCount FROM Message m WHERE m.chatGroup = :chatGroup AND " +
           "m.isDeleted = false AND m.timestamp > :since GROUP BY m.user ORDER BY COUNT(m) DESC")
    List<Object[]> findMostActiveUsersInGroup(@Param("chatGroup") ChatGroup chatGroup, @Param("since") LocalDateTime since, Pageable pageable);
    
    // Admin/Moderation queries
    @Query("SELECT m FROM Message m WHERE m.isDeleted = false ORDER BY m.timestamp DESC")
    Page<Message> findAllMessages(Pageable pageable);
    
    @Query("SELECT m FROM Message m WHERE m.isDeleted = true ORDER BY m.deletedAt DESC")
    Page<Message> findDeletedMessages(Pageable pageable);
    
    // Soft delete message
    @Modifying
    @Query("UPDATE Message m SET m.isDeleted = true, m.deletedAt = :deletedAt, m.deletedBy = :deletedBy, m.content = null " +
           "WHERE m.id = :messageId")
    void softDeleteMessage(@Param("messageId") UUID messageId, @Param("deletedAt") LocalDateTime deletedAt, @Param("deletedBy") UUID deletedBy);
    
    // Update message content (for edits)
    @Modifying
    @Query("UPDATE Message m SET m.content = :content, m.isEdited = true, m.editedAt = :editedAt WHERE m.id = :messageId")
    void updateMessageContent(@Param("messageId") UUID messageId, @Param("content") String content, @Param("editedAt") LocalDateTime editedAt);
    
    // Cleanup old deleted messages (hard delete after certain period)
    @Modifying
    @Query("DELETE FROM Message m WHERE m.isDeleted = true AND m.deletedAt < :before")
    void hardDeleteOldMessages(@Param("before") LocalDateTime before);
}