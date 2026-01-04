package com.churchapp.service;

import com.churchapp.dto.WorshipAvatarResponse;
import com.churchapp.entity.User;
import com.churchapp.entity.WorshipAvatar;
import com.churchapp.repository.UserRepository;
import com.churchapp.repository.WorshipAvatarRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing animated worship avatars.
 * Handles avatar listing, selection, and retrieval for dance floor display.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorshipAvatarService {

    private final WorshipAvatarRepository avatarRepository;
    private final UserRepository userRepository;

    /**
     * Get all available avatars with selection status for the user
     */
    @Transactional(readOnly = true)
    public List<WorshipAvatarResponse> getAvailableAvatars(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        List<WorshipAvatar> avatars = avatarRepository.findByIsActiveTrueOrderBySortOrderAsc();
        UUID selectedId = user.getSelectedAvatarId();

        return avatars.stream()
            .map(avatar -> WorshipAvatarResponse.fromEntity(avatar, selectedId))
            .collect(Collectors.toList());
    }

    /**
     * Select an avatar for the user
     */
    @Transactional
    public WorshipAvatarResponse selectAvatar(String userEmail, UUID avatarId) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        WorshipAvatar avatar = avatarRepository.findById(avatarId)
            .orElseThrow(() -> new EntityNotFoundException("Avatar not found"));

        if (!avatar.getIsActive()) {
            throw new IllegalArgumentException("This avatar is not available");
        }

        user.setSelectedAvatarId(avatarId);
        userRepository.save(user);

        log.info("User {} selected avatar: {}", userEmail, avatar.getName());

        return WorshipAvatarResponse.fromEntity(avatar, avatarId);
    }

    /**
     * Get the user's currently selected avatar (or default if none selected)
     */
    @Transactional(readOnly = true)
    public WorshipAvatarResponse getUserAvatar(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));

        return getAvatarForUser(user);
    }

    /**
     * Get avatar for a user by their ID (used when loading participant data)
     */
    @Transactional(readOnly = true)
    public WorshipAvatarResponse getAvatarForUserId(UUID userId) {
        User user = userRepository.findById(userId)
            .orElse(null);

        if (user == null) {
            return getDefaultAvatar();
        }

        return getAvatarForUser(user);
    }

    /**
     * Get avatar response for a user
     */
    private WorshipAvatarResponse getAvatarForUser(User user) {
        if (user.getSelectedAvatarId() == null) {
            return getDefaultAvatar();
        }

        WorshipAvatar avatar = avatarRepository.findById(user.getSelectedAvatarId())
            .orElse(null);

        if (avatar == null || !avatar.getIsActive()) {
            return getDefaultAvatar();
        }

        return WorshipAvatarResponse.fromEntity(avatar, user.getSelectedAvatarId());
    }

    /**
     * Get the default avatar (first available)
     */
    @Transactional(readOnly = true)
    public WorshipAvatarResponse getDefaultAvatar() {
        return avatarRepository.findFirstByIsActiveTrueOrderBySortOrderAsc()
            .map(WorshipAvatarResponse::fromEntity)
            .orElse(null);
    }

    /**
     * Get an avatar by ID
     */
    @Transactional(readOnly = true)
    public WorshipAvatarResponse getAvatarById(UUID avatarId) {
        return avatarRepository.findById(avatarId)
            .filter(WorshipAvatar::getIsActive)
            .map(WorshipAvatarResponse::fromEntity)
            .orElse(null);
    }
}
