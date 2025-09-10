package com.churchapp.repository;

import com.churchapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByGoogleId(String googleId);
    
    boolean existsByEmail(String email);
    
    boolean existsByGoogleId(String googleId);
    
    @Modifying
    @Query("UPDATE User u SET u.lastLogin = :lastLogin WHERE u.id = :userId")
    void updateLastLogin(@Param("userId") UUID userId, @Param("lastLogin") LocalDateTime lastLogin);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.isActive = true")
    Long countActiveUsers();
    
    @Query("SELECT u FROM User u WHERE u.isActive = true ORDER BY u.createdAt DESC")
    List<User> findAllActiveUsers();
    
    // Dashboard-specific queries
    List<User> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime createdAfter, Pageable pageable);
    
    @Query("SELECT u FROM User u WHERE u.updatedAt > :updatedAfter AND u.updatedAt != u.createdAt ORDER BY u.updatedAt DESC")
    List<User> findByUpdatedAtAfterAndUpdatedAtNotEqualToCreatedAtOrderByUpdatedAtDesc(@Param("updatedAfter") LocalDateTime updatedAfter);
    
    long countByCreatedAtAfter(LocalDateTime createdAfter);
}