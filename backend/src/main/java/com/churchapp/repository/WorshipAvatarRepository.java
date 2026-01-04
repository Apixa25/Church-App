package com.churchapp.repository;

import com.churchapp.entity.WorshipAvatar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipAvatarRepository extends JpaRepository<WorshipAvatar, UUID> {

    /**
     * Find all active avatars sorted by their display order
     */
    List<WorshipAvatar> findByIsActiveTrueOrderBySortOrderAsc();

    /**
     * Find an avatar by name
     */
    Optional<WorshipAvatar> findByNameAndIsActiveTrue(String name);

    /**
     * Count active avatars
     */
    long countByIsActiveTrue();

    /**
     * Get the first available avatar (for default selection)
     */
    Optional<WorshipAvatar> findFirstByIsActiveTrueOrderBySortOrderAsc();
}
