package com.churchapp.repository;

import com.churchapp.entity.User;
import com.churchapp.entity.WorshipPlaylist;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorshipPlaylistRepository extends JpaRepository<WorshipPlaylist, UUID> {

    // Find all active playlists
    List<WorshipPlaylist> findByIsActiveTrueOrderByCreatedAtDesc();

    // Find public playlists
    List<WorshipPlaylist> findByIsPublicTrueAndIsActiveTrueOrderByCreatedAtDesc();

    // Find playlists by creator
    List<WorshipPlaylist> findByCreatedByAndIsActiveTrueOrderByCreatedAtDesc(User createdBy);

    // Find playlists by creator ID
    @Query("SELECT wp FROM WorshipPlaylist wp WHERE wp.createdBy.id = :userId AND wp.isActive = true ORDER BY wp.createdAt DESC")
    List<WorshipPlaylist> findByCreatedByIdAndIsActiveTrue(@Param("userId") UUID userId);

    // Find popular playlists (by play count)
    @Query("SELECT wp FROM WorshipPlaylist wp WHERE wp.isPublic = true AND wp.isActive = true ORDER BY wp.playCount DESC")
    List<WorshipPlaylist> findPopularPlaylists(Pageable pageable);

    // Search playlists by name or description
    @Query("SELECT wp FROM WorshipPlaylist wp WHERE wp.isActive = true AND wp.isPublic = true AND " +
           "(LOWER(wp.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(wp.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    List<WorshipPlaylist> searchPlaylists(@Param("searchTerm") String searchTerm);

    // Count playlists by creator
    long countByCreatedByAndIsActiveTrue(User createdBy);

    // Admin queries
    Page<WorshipPlaylist> findByIsActiveTrueOrderByCreatedAtDesc(Pageable pageable);
}
