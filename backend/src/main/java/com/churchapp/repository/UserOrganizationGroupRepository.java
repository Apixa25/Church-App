package com.churchapp.repository;

import com.churchapp.entity.UserOrganizationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserOrganizationGroupRepository extends JpaRepository<UserOrganizationGroup, UUID> {
    
    Optional<UserOrganizationGroup> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    
    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    
    List<UserOrganizationGroup> findByUserId(UUID userId);
    
    @Query("SELECT uog FROM UserOrganizationGroup uog WHERE uog.user.id = :userId AND uog.isMuted = false")
    List<UserOrganizationGroup> findUnmutedByUserId(UUID userId);
    
    @Query("SELECT uog.organization.id FROM UserOrganizationGroup uog WHERE uog.user.id = :userId AND uog.isMuted = false")
    List<UUID> findUnmutedOrganizationIdsByUserId(UUID userId);
    
    @Query("SELECT uog FROM UserOrganizationGroup uog WHERE uog.user.id = :userId AND uog.isMuted = true")
    List<UserOrganizationGroup> findMutedByUserId(UUID userId);
    
    @Modifying
    @Query("UPDATE UserOrganizationGroup uog SET uog.isMuted = :isMuted WHERE uog.user.id = :userId AND uog.organization.id = :organizationId")
    void updateMuteStatus(@Param("userId") UUID userId, @Param("organizationId") UUID organizationId, @Param("isMuted") boolean isMuted);
    
    void deleteByUserIdAndOrganizationId(UUID userId, UUID organizationId);
}

