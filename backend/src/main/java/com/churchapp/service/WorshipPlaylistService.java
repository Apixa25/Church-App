package com.churchapp.service;

import com.churchapp.dto.*;
import com.churchapp.entity.User;
import com.churchapp.entity.WorshipPlaylist;
import com.churchapp.entity.WorshipPlaylistEntry;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.WorshipPlaylistEntryRepository;
import com.churchapp.repository.WorshipPlaylistRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorshipPlaylistService {

    private final WorshipPlaylistRepository playlistRepository;
    private final WorshipPlaylistEntryRepository entryRepository;
    private final UserRepository userRepository;

    // ==================== PLAYLIST CRUD ====================

    @Transactional
    public WorshipPlaylistResponse createPlaylist(String userEmail, WorshipPlaylistRequest request) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylist playlist = new WorshipPlaylist();
        playlist.setName(request.getName());
        playlist.setDescription(request.getDescription());
        playlist.setImageUrl(request.getImageUrl());
        playlist.setCreatedBy(user);
        playlist.setIsPublic(request.getIsPublic() != null ? request.getIsPublic() : true);
        playlist.setIsActive(true);
        playlist.setTotalDuration(0);
        playlist.setVideoCount(0);
        playlist.setPlayCount(0);

        playlist = playlistRepository.save(playlist);

        // Add initial entries if provided
        if (request.getEntries() != null && !request.getEntries().isEmpty()) {
            int position = 0;
            for (WorshipPlaylistEntryRequest entryRequest : request.getEntries()) {
                addEntryToPlaylist(playlist, user, entryRequest, position++);
            }
            playlist = playlistRepository.save(playlist);
        }

        log.info("User {} created playlist: {}", userEmail, playlist.getName());

        WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist, true);
        response.setIsCreator(true);
        response.setCanEdit(true);
        response.setCanDelete(true);
        return response;
    }

    @Transactional(readOnly = true)
    public WorshipPlaylistResponse getPlaylistById(String userEmail, UUID playlistId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new EntityNotFoundException("Playlist not found"));

        if (!playlist.getIsActive()) {
            throw new EntityNotFoundException("Playlist not found");
        }

        // Check visibility
        if (!playlist.getIsPublic() && !playlist.isCreator(user)) {
            throw new IllegalStateException("You don't have permission to view this playlist");
        }

        WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist, true);
        boolean isCreator = playlist.isCreator(user);
        response.setIsCreator(isCreator);
        response.setCanEdit(isCreator);
        response.setCanDelete(isCreator);
        return response;
    }

    @Transactional(readOnly = true)
    public List<WorshipPlaylistResponse> getPublicPlaylists(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return playlistRepository.findByIsPublicTrueAndIsActiveTrueOrderByCreatedAtDesc()
            .stream()
            .map(playlist -> {
                WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist);
                boolean isCreator = playlist.isCreator(user);
                response.setIsCreator(isCreator);
                response.setCanEdit(isCreator);
                response.setCanDelete(isCreator);
                return response;
            })
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipPlaylistResponse> getMyPlaylists(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return playlistRepository.findByCreatedByAndIsActiveTrueOrderByCreatedAtDesc(user)
            .stream()
            .map(playlist -> {
                WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist);
                response.setIsCreator(true);
                response.setCanEdit(true);
                response.setCanDelete(true);
                return response;
            })
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipPlaylistResponse> getPopularPlaylists(String userEmail, int limit) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return playlistRepository.findPopularPlaylists(PageRequest.of(0, limit))
            .stream()
            .map(playlist -> {
                WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist);
                boolean isCreator = playlist.isCreator(user);
                response.setIsCreator(isCreator);
                response.setCanEdit(isCreator);
                response.setCanDelete(isCreator);
                return response;
            })
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WorshipPlaylistResponse> searchPlaylists(String userEmail, String searchTerm) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return playlistRepository.searchPlaylists(searchTerm)
            .stream()
            .map(playlist -> {
                WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist);
                boolean isCreator = playlist.isCreator(user);
                response.setIsCreator(isCreator);
                response.setCanEdit(isCreator);
                response.setCanDelete(isCreator);
                return response;
            })
            .collect(Collectors.toList());
    }

    @Transactional
    public WorshipPlaylistResponse updatePlaylist(String userEmail, UUID playlistId, WorshipPlaylistRequest request) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new EntityNotFoundException("Playlist not found"));

        if (!playlist.isCreator(user)) {
            throw new IllegalStateException("Only the playlist creator can update it");
        }

        playlist.setName(request.getName());
        playlist.setDescription(request.getDescription());
        if (request.getImageUrl() != null) {
            playlist.setImageUrl(request.getImageUrl());
        }
        if (request.getIsPublic() != null) {
            playlist.setIsPublic(request.getIsPublic());
        }

        playlist = playlistRepository.save(playlist);
        log.info("User {} updated playlist: {}", userEmail, playlist.getName());

        WorshipPlaylistResponse response = new WorshipPlaylistResponse(playlist, true);
        response.setIsCreator(true);
        response.setCanEdit(true);
        response.setCanDelete(true);
        return response;
    }

    @Transactional
    public void deletePlaylist(String userEmail, UUID playlistId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new EntityNotFoundException("Playlist not found"));

        if (!playlist.isCreator(user)) {
            throw new IllegalStateException("Only the playlist creator can delete it");
        }

        // Soft delete
        playlist.setIsActive(false);
        playlistRepository.save(playlist);
        log.info("User {} deleted playlist: {}", userEmail, playlist.getName());
    }

    // ==================== PLAYLIST ENTRIES ====================

    @Transactional
    public WorshipPlaylistEntryResponse addEntry(String userEmail, UUID playlistId, WorshipPlaylistEntryRequest request) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new EntityNotFoundException("Playlist not found"));

        if (!playlist.isCreator(user)) {
            throw new IllegalStateException("Only the playlist creator can add entries");
        }

        // Get next position
        Integer maxPosition = entryRepository.getMaxPosition(playlist);
        int nextPosition = (maxPosition != null ? maxPosition : -1) + 1;

        WorshipPlaylistEntry entry = addEntryToPlaylist(playlist, user, request, nextPosition);
        playlistRepository.save(playlist);

        log.info("User {} added entry to playlist {}: {}", userEmail, playlist.getName(), request.getVideoTitle());
        return new WorshipPlaylistEntryResponse(entry);
    }

    @Transactional
    public void removeEntry(String userEmail, UUID entryId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylistEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new EntityNotFoundException("Entry not found"));

        WorshipPlaylist playlist = entry.getPlaylist();

        if (!playlist.isCreator(user)) {
            throw new IllegalStateException("Only the playlist creator can remove entries");
        }

        int removedPosition = entry.getPosition();
        playlist.removeEntry(entry);
        entryRepository.delete(entry);

        // Shift positions down for entries after the removed one
        entryRepository.shiftPositionsDown(playlist, removedPosition);

        playlistRepository.save(playlist);
        log.info("User {} removed entry from playlist {}", userEmail, playlist.getName());
    }

    @Transactional
    public WorshipPlaylistEntryResponse updateEntryPosition(String userEmail, UUID entryId, int newPosition) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylistEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new EntityNotFoundException("Entry not found"));

        WorshipPlaylist playlist = entry.getPlaylist();

        if (!playlist.isCreator(user)) {
            throw new IllegalStateException("Only the playlist creator can reorder entries");
        }

        int oldPosition = entry.getPosition();

        if (oldPosition == newPosition) {
            return new WorshipPlaylistEntryResponse(entry);
        }

        // Shift other entries
        if (newPosition < oldPosition) {
            // Moving up - shift others down
            entryRepository.shiftPositionsUp(playlist, newPosition);
        } else {
            // Moving down - shift others up
            entryRepository.shiftPositionsDown(playlist, oldPosition);
        }

        entry.setPosition(newPosition);
        entry = entryRepository.save(entry);

        log.info("User {} reordered entry in playlist {}", userEmail, playlist.getName());
        return new WorshipPlaylistEntryResponse(entry);
    }

    @Transactional(readOnly = true)
    public List<WorshipPlaylistEntryResponse> getPlaylistEntries(String userEmail, UUID playlistId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipPlaylist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new EntityNotFoundException("Playlist not found"));

        // Check visibility
        if (!playlist.getIsPublic() && !playlist.isCreator(user)) {
            throw new IllegalStateException("You don't have permission to view this playlist");
        }

        return entryRepository.findByPlaylistIdOrderByPositionAsc(playlistId)
            .stream()
            .map(WorshipPlaylistEntryResponse::new)
            .collect(Collectors.toList());
    }

    // ==================== HELPER METHODS ====================

    private WorshipPlaylistEntry addEntryToPlaylist(WorshipPlaylist playlist, User user,
                                                     WorshipPlaylistEntryRequest request, int position) {
        WorshipPlaylistEntry entry = new WorshipPlaylistEntry();
        entry.setPlaylist(playlist);
        entry.setVideoId(request.getVideoId());
        entry.setVideoTitle(request.getVideoTitle());
        entry.setVideoDuration(request.getVideoDuration());
        entry.setVideoThumbnailUrl(request.getVideoThumbnailUrl());
        entry.setPosition(position);
        entry.setAddedBy(user);

        entry = entryRepository.save(entry);
        playlist.addEntry(entry);

        return entry;
    }

    @Transactional
    public void incrementPlayCount(UUID playlistId) {
        WorshipPlaylist playlist = playlistRepository.findById(playlistId)
            .orElseThrow(() -> new EntityNotFoundException("Playlist not found"));
        playlist.incrementPlayCount();
        playlistRepository.save(playlist);
    }
}
