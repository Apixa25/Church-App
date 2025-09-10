package com.churchapp.repository;

import com.churchapp.entity.ChatGroup;
import com.churchapp.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, UUID> {
    
    // Find by name
    Optional<ChatGroup> findByNameAndIsActiveTrue(String name);
    
    // Find by type
    List<ChatGroup> findByTypeAndIsActiveTrueOrderByCreatedAtAsc(ChatGroup.GroupType type);
    
    // Find groups created by user
    List<ChatGroup> findByCreatedByAndIsActiveTrueOrderByCreatedAtDesc(User createdBy);
    
    // Find public groups
    List<ChatGroup> findByIsPrivateFalseAndIsActiveTrueOrderByCreatedAtDesc();
    
    // Find groups by search term
    @Query("SELECT cg FROM ChatGroup cg WHERE cg.isActive = true AND " +
           "(LOWER(cg.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(cg.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<ChatGroup> findBySearchTerm(@Param("searchTerm") String searchTerm);
    
    // Find groups where user is a member
    @Query("SELECT DISTINCT cgm.chatGroup FROM ChatGroupMember cgm " +
           "WHERE cgm.user = :user AND cgm.isActive = true AND cgm.chatGroup.isActive = true " +
           "ORDER BY cgm.chatGroup.updatedAt DESC")
    List<ChatGroup> findGroupsByMember(@Param("user") User user);
    
    // Find groups where user is a member with pagination
    @Query("SELECT DISTINCT cgm.chatGroup FROM ChatGroupMember cgm " +
           "WHERE cgm.user = :user AND cgm.isActive = true AND cgm.chatGroup.isActive = true " +
           "ORDER BY cgm.chatGroup.updatedAt DESC")
    Page<ChatGroup> findGroupsByMember(@Param("user") User user, Pageable pageable);
    
    // Find groups user can join (public groups user is not already a member of)
    @Query("SELECT cg FROM ChatGroup cg WHERE cg.isActive = true AND cg.isPrivate = false AND " +
           "cg.id NOT IN (SELECT cgm.chatGroup.id FROM ChatGroupMember cgm WHERE cgm.user = :user AND cgm.isActive = true)")
    List<ChatGroup> findJoinableGroups(@Param("user") User user);
    
    // Count active groups by type
    @Query("SELECT COUNT(cg) FROM ChatGroup cg WHERE cg.type = :type AND cg.isActive = true")
    long countByTypeAndIsActiveTrue(@Param("type") ChatGroup.GroupType type);
    
    // Find groups with recent activity
    @Query("SELECT DISTINCT m.chatGroup FROM Message m " +
           "WHERE m.timestamp > :since AND m.chatGroup.isActive = true " +
           "ORDER BY m.timestamp DESC")
    List<ChatGroup> findGroupsWithRecentActivity(@Param("since") LocalDateTime since);
    
    // Find popular groups (by member count)
    @Query("SELECT cg FROM ChatGroup cg " +
           "LEFT JOIN ChatGroupMember cgm ON cg.id = cgm.chatGroup.id " +
           "WHERE cg.isActive = true AND cg.isPrivate = false " +
           "GROUP BY cg.id " +
           "ORDER BY COUNT(cgm.id) DESC")
    List<ChatGroup> findPopularGroups(Pageable pageable);
    
    // Admin queries
    @Query("SELECT cg FROM ChatGroup cg WHERE cg.isActive = true ORDER BY cg.createdAt DESC")
    Page<ChatGroup> findAllActiveGroups(Pageable pageable);
    
    @Query("SELECT COUNT(cg) FROM ChatGroup cg WHERE cg.createdAt > :since")
    long countGroupsCreatedSince(@Param("since") LocalDateTime since);
    
    // Find groups needing moderation (reports, etc.)
    @Query("SELECT cg FROM ChatGroup cg WHERE cg.isActive = true AND " +
           "(SELECT COUNT(m) FROM Message m WHERE m.chatGroup = cg AND m.timestamp > :since) = 0")
    List<ChatGroup> findInactiveGroups(@Param("since") LocalDateTime since);
    
    // Find direct message conversation between two users
    @Query("SELECT cg FROM ChatGroup cg " +
           "JOIN ChatGroupMember cgm1 ON cg.id = cgm1.chatGroup.id " +
           "JOIN ChatGroupMember cgm2 ON cg.id = cgm2.chatGroup.id " +
           "WHERE cg.type = 'DIRECT_MESSAGE' AND cg.isActive = true AND " +
           "cgm1.user = :user1 AND cgm1.isActive = true AND " +
           "cgm2.user = :user2 AND cgm2.isActive = true AND " +
           "cgm1.user != cgm2.user")
    List<ChatGroup> findDirectMessageBetweenUsers(@Param("user1") User user1, @Param("user2") User user2);
}