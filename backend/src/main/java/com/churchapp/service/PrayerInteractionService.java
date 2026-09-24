package com.churchapp.service;

import com.churchapp.dto.PrayerInteractionRequest;
import com.churchapp.dto.PrayerInteractionResponse;
import com.churchapp.dto.PrayerInteractionSummary;
import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.dto.PrayerParticipantResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.churchapp.entity.PrayerInteraction;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Reactions and comments on prayer requests.
 *
 * Every entry point that takes a viewer id runs the same church check as the
 * prayer itself ({@link PrayerAccessPolicy}); a prayer's UUID is not a ticket
 * to its comments.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PrayerInteractionService {
    
    private final PrayerInteractionRepository prayerInteractionRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final UserRepository userRepository;
    private final PrayerAccessPolicy prayerAccessPolicy;
    private final SimpMessagingTemplate messagingTemplate;
    
    public PrayerInteractionResponse createInteraction(UUID userId, PrayerInteractionRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        PrayerRequest prayerRequest = requirePrayer(request.getPrayerRequestId());
        prayerAccessPolicy.assertCanView(prayerRequest, user);
        
        // For reactions (non-comment types), check if user already has this type of interaction
        if (request.getType() != PrayerInteraction.InteractionType.COMMENT) {
            Optional<PrayerInteraction> existingInteraction = prayerInteractionRepository
                .findByPrayerRequestAndUserAndType(prayerRequest, user, request.getType());
            
            if (existingInteraction.isPresent()) {
                // Toggle behavior - remove the existing interaction
                prayerInteractionRepository.delete(existingInteraction.get());
                log.info("Removed {} interaction for prayer {} by user {}", 
                    request.getType(), request.getPrayerRequestId(), userId);
                return null; // Indicate removal
            }
        }

        if (request.getParentInteractionId() != null && request.getType() != PrayerInteraction.InteractionType.COMMENT) {
            throw new RuntimeException("Only comments can have a parent interaction");
        }
        
        // Create new interaction
        PrayerInteraction interaction = new PrayerInteraction();
        interaction.setPrayerRequest(prayerRequest);
        interaction.setUser(user);
        interaction.setType(request.getType());
        
        // Content is required for comments, optional for reactions
        if (request.getType() == PrayerInteraction.InteractionType.COMMENT) {
            if (request.getContent() == null || request.getContent().trim().isEmpty()) {
                throw new RuntimeException("Comment content is required");
            }
            interaction.setContent(request.getContent().trim());

            if (request.getParentInteractionId() != null) {
                PrayerInteraction parentInteraction = prayerInteractionRepository.findById(request.getParentInteractionId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found with id: " + request.getParentInteractionId()));

                if (parentInteraction.getType() != PrayerInteraction.InteractionType.COMMENT) {
                    throw new RuntimeException("Parent interaction must be a comment");
                }

                if (!parentInteraction.getPrayerRequest().getId().equals(prayerRequest.getId())) {
                    throw new RuntimeException("Parent comment belongs to a different prayer request");
                }

                interaction.setParentInteraction(parentInteraction);
            }
        } else {
            interaction.setContent(request.getContent() != null ? request.getContent().trim() : null);
            interaction.setParentInteraction(null);
        }
        
        PrayerInteraction savedInteraction = prayerInteractionRepository.save(interaction);
        log.info("Created {} interaction for prayer {} by user {}", 
            request.getType(), request.getPrayerRequestId(), userId);
        
        // Send WebSocket notification for prayer interaction
        notifyPrayerInteraction(savedInteraction);
        
        return PrayerInteractionResponse.fromPrayerInteraction(savedInteraction);
    }
    
    public void deleteInteraction(UUID interactionId, UUID userId) {
        PrayerInteraction interaction = prayerInteractionRepository.findById(interactionId)
            .orElseThrow(() -> new RuntimeException("Interaction not found with id: " + interactionId));
        
        // Only the owner can delete their interaction
        if (!interaction.getUser().getId().equals(userId)) {
            throw new RuntimeException("You can only delete your own interactions");
        }
        
        prayerInteractionRepository.delete(interaction);
        log.info("Deleted interaction {} by user {}", interactionId, userId);
    }
    
    public List<PrayerInteractionResponse> getInteractionsByPrayerRequest(UUID prayerRequestId, UUID viewerId) {
        requireViewablePrayer(prayerRequestId, viewerId);
        
        List<PrayerInteraction> interactions = prayerInteractionRepository
            .findByPrayerRequestIdOrderByTimestampDesc(prayerRequestId);
        
        return interactions.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public Page<PrayerInteractionResponse> getInteractionsByPrayerRequest(UUID prayerRequestId, UUID viewerId, int page, int size) {
        PrayerRequest prayerRequest = requireViewablePrayer(prayerRequestId, viewerId);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerInteraction> interactions = prayerInteractionRepository
            .findByPrayerRequestOrderByTimestampDesc(prayerRequest, pageable);
        
        return interactions.map(PrayerInteractionResponse::fromPrayerInteraction);
    }
    
    public List<PrayerInteractionResponse> getCommentsByPrayerRequest(UUID prayerRequestId, UUID viewerId) {
        requireViewablePrayer(prayerRequestId, viewerId);
        
        List<PrayerInteraction> comments = prayerInteractionRepository
            .findCommentsByPrayerRequestId(prayerRequestId);
        
        return comments.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public Page<PrayerInteractionResponse> getCommentsByPrayerRequest(UUID prayerRequestId, UUID viewerId, int page, int size) {
        requireViewablePrayer(prayerRequestId, viewerId);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerInteraction> comments = prayerInteractionRepository
            .findCommentsByPrayerRequestId(prayerRequestId, pageable);
        
        return comments.map(PrayerInteractionResponse::fromPrayerInteraction);
    }
    
    public List<PrayerInteractionResponse> getReactionsByPrayerRequest(UUID prayerRequestId, UUID viewerId) {
        requireViewablePrayer(prayerRequestId, viewerId);
        
        List<PrayerInteraction> reactions = prayerInteractionRepository
            .findReactionsByPrayerRequestId(prayerRequestId);
        
        return reactions.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    /** Summary for a viewer; runs the church check. */
    public PrayerInteractionSummary getInteractionSummary(UUID prayerRequestId, UUID viewerId) {
        requireViewablePrayer(prayerRequestId, viewerId);
        return getInteractionSummary(prayerRequestId);
    }

    /**
     * Summary without an access check. Only for callers that have already
     * verified the viewer may see the prayer (e.g. enriching a list the
     * PrayerRequestService has already scoped to the viewer's church).
     */
    public PrayerInteractionSummary getInteractionSummary(UUID prayerRequestId) {
        requirePrayer(prayerRequestId);
        
        PrayerInteractionSummary summary = new PrayerInteractionSummary();
        
        // Get total interactions
        long totalInteractions = prayerInteractionRepository.countByPrayerRequestId(prayerRequestId);
        summary.setTotalInteractions(totalInteractions);
        
        // Get total comments
        long totalComments = prayerInteractionRepository.countByPrayerRequestIdAndType(
            prayerRequestId, PrayerInteraction.InteractionType.COMMENT);
        summary.setTotalComments(totalComments);
        
        // Get unique participants
        long uniqueParticipants = prayerInteractionRepository.countDistinctUsersByPrayerRequestId(prayerRequestId);
        summary.setUniqueParticipants(uniqueParticipants);
        
        // Get counts by interaction type
        List<Object[]> interactionCounts = prayerInteractionRepository.getInteractionCountsByType(prayerRequestId);
        for (Object[] count : interactionCounts) {
            PrayerInteraction.InteractionType type = (PrayerInteraction.InteractionType) count[0];
            Long typeCount = (Long) count[1];
            summary.setInteractionCount(type, typeCount);
        }
        
        return summary;
    }
    
    public List<PrayerInteractionResponse> getUserInteractions(UUID userId) {
        List<PrayerInteraction> interactions = prayerInteractionRepository
            .findByUserIdOrderByTimestampDesc(userId);
        
        return interactions.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public boolean hasUserInteracted(UUID prayerRequestId, UUID userId, PrayerInteraction.InteractionType type) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        PrayerRequest prayerRequest = requirePrayer(prayerRequestId);
        prayerAccessPolicy.assertCanView(prayerRequest, user);
        
        return prayerInteractionRepository.existsByPrayerRequestAndUserAndType(prayerRequest, user, type);
    }
    
    /**
     * Recent activity for the dashboard, limited to the viewer's church.
     * Users without a church see nothing.
     */
    public List<PrayerInteractionResponse> getRecentInteractionsForDashboard(UUID viewerId, int limit) {
        User viewer = userRepository.findById(viewerId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + viewerId));
        UUID churchId = prayerAccessPolicy.churchIdOf(viewer);
        if (churchId == null) {
            return List.of();
        }

        Pageable pageable = PageRequest.of(0, Math.max(1, Math.min(limit, 50)));
        LocalDateTime since = LocalDateTime.now().minusDays(7); // Last 7 days
        List<PrayerInteraction> recentInteractions = prayerInteractionRepository
            .findRecentByOrganizationId(churchId, since, pageable);
        
        return recentInteractions.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public List<PrayerInteractionResponse> getRecentActivityForPrayer(UUID prayerRequestId, LocalDateTime since) {
        List<PrayerInteraction> recentActivity = prayerInteractionRepository
            .findRecentActivityByPrayerRequestId(prayerRequestId, since);

        return recentActivity.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }

    /**
     * Get unique participants who have interacted with a prayer request (excluding comments).
     * Returns user details for displaying avatar stacks and supporter lists.
     */
    public List<PrayerParticipantResponse> getParticipants(UUID prayerRequestId, UUID viewerId) {
        requireViewablePrayer(prayerRequestId, viewerId);

        return prayerInteractionRepository.findDistinctParticipantsByPrayerRequestId(prayerRequestId);
    }
    
    /**
     * Send WebSocket notification for prayer interaction
     */
    private void notifyPrayerInteraction(PrayerInteraction interaction) {
        try {
            User user = interaction.getUser();
            PrayerRequest prayerRequest = interaction.getPrayerRequest();
            
            PrayerNotificationEvent event = PrayerNotificationEvent.prayerInteraction(interaction);
            
            // Broadcast to subscribers of this prayer (subscription is church-gated)
            messagingTemplate.convertAndSend(PrayerTopics.prayerInteractions(prayerRequest.getId()), event);
            
            // Also send to prayer request owner if different from interaction user
            if (!prayerRequest.getUser().getId().equals(user.getId())) {
                messagingTemplate.convertAndSendToUser(
                    prayerRequest.getUser().getEmail(),
                    "/queue/prayers",
                    event
                );
            }
            
            log.info("Broadcasted prayer interaction notification for prayer: {} by user: {}", 
                prayerRequest.getId(), user.getId());
            
        } catch (Exception e) {
            log.error("Error sending prayer interaction notification: {}", e.getMessage());
        }
    }

    /**
     * Comments others have made on prayers owned by {@code userId}, for the
     * "Comments on my content" profile tab.
     *
     * Only the owner sees comments on their anonymous prayers — otherwise the
     * profile tab would tie a named person to an "anonymous" request. The
     * viewer must also share a church with the profile owner.
     */
    public Page<PrayerInteractionResponse> getCommentsReceivedByUser(UUID userId, UUID viewerId, int page, int size) {
        boolean isSelf = userId.equals(viewerId);
        if (!isSelf) {
            assertSameChurch(userId, viewerId);
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerInteraction> interactions = prayerInteractionRepository
            .findCommentsReceivedByUserId(userId, isSelf, pageable);
        return interactions.map(PrayerInteractionResponse::fromPrayerInteraction);
    }

    /**
     * Get count of comments received on prayers owned by a specific user
     */
    public long getCommentsReceivedCount(UUID userId, UUID viewerId) {
        boolean isSelf = userId.equals(viewerId);
        if (!isSelf) {
            assertSameChurch(userId, viewerId);
        }
        return prayerInteractionRepository.countCommentsReceivedByUserId(userId, isSelf);
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private PrayerRequest requirePrayer(UUID prayerRequestId) {
        return prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
    }

    private PrayerRequest requireViewablePrayer(UUID prayerRequestId, UUID viewerId) {
        PrayerRequest prayerRequest = requirePrayer(prayerRequestId);
        prayerAccessPolicy.assertCanView(prayerRequest, viewerId);
        return prayerRequest;
    }

    private void assertSameChurch(UUID targetUserId, UUID viewerId) {
        User viewer = userRepository.findById(viewerId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + viewerId));
        if (viewer.getRole() == User.Role.PLATFORM_ADMIN) {
            return;
        }
        User target = userRepository.findById(targetUserId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + targetUserId));
        UUID viewerChurch = prayerAccessPolicy.churchIdOf(viewer);
        UUID targetChurch = prayerAccessPolicy.churchIdOf(target);
        if (viewerChurch == null || !viewerChurch.equals(targetChurch)) {
            throw new RuntimeException(PrayerAccessPolicy.OUTSIDE_CHURCH_MESSAGE);
        }
    }
}
