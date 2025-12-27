package com.churchapp.repository;

import com.churchapp.entity.WorshipPlaylist;
import com.churchapp.entity.WorshipPlaylistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipPlaylistEntryRepository extends JpaRepository<WorshipPlaylistEntry, UUID> {

    // Find entries by playlist ordered by position
    List<WorshipPlaylistEntry> findByPlaylistOrderByPositionAsc(WorshipPlaylist playlist);

    // Find entries by playlist ID
    @Query("SELECT wpe FROM WorshipPlaylistEntry wpe WHERE wpe.playlist.id = :playlistId ORDER BY wpe.position ASC")
    List<WorshipPlaylistEntry> findByPlaylistIdOrderByPositionAsc(@Param("playlistId") UUID playlistId);

    // Find entry at specific position
    Optional<WorshipPlaylistEntry> findByPlaylistAndPosition(WorshipPlaylist playlist, Integer position);

    // Get max position in playlist
    @Query("SELECT MAX(wpe.position) FROM WorshipPlaylistEntry wpe WHERE wpe.playlist = :playlist")
    Integer getMaxPosition(@Param("playlist") WorshipPlaylist playlist);

    // Count entries in playlist
    long countByPlaylist(WorshipPlaylist playlist);

    // Check if video already exists in playlist
    boolean existsByPlaylistAndVideoId(WorshipPlaylist playlist, String videoId);

    // Delete all entries for a playlist
    @Modifying
    @Query("DELETE FROM WorshipPlaylistEntry wpe WHERE wpe.playlist = :playlist")
    void deleteByPlaylist(@Param("playlist") WorshipPlaylist playlist);

    // Update positions (shift down) after removing an entry
    @Modifying
    @Query("UPDATE WorshipPlaylistEntry wpe SET wpe.position = wpe.position - 1 WHERE wpe.playlist = :playlist AND wpe.position > :position")
    void shiftPositionsDown(@Param("playlist") WorshipPlaylist playlist, @Param("position") Integer position);

    // Update positions (shift up) for inserting an entry
    @Modifying
    @Query("UPDATE WorshipPlaylistEntry wpe SET wpe.position = wpe.position + 1 WHERE wpe.playlist = :playlist AND wpe.position >= :position")
    void shiftPositionsUp(@Param("playlist") WorshipPlaylist playlist, @Param("position") Integer position);
}
