package com.churchapp.service;

import com.churchapp.dto.PrayerInteractionRequest;
import com.churchapp.dto.PrayerInteractionResponse;
import com.churchapp.dto.PrayerInteractionSummary;
import com.churchapp.dto.PrayerNotificationEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import com.churchapp.entity.PrayerInteraction;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.User;
import com.churchapp.repository.PrayerInteractionRepository;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PrayerInteractionService {
    
    private final PrayerInteractionRepository prayerInteractionRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final UserRepository userRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    public PrayerInteractionResponse createInteraction(UUID userId, PrayerInteractionRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        PrayerRequest prayerRequest = prayerRequestRepository.findById(request.getPrayerRequestId())
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + request.getPrayerRequestId()));
        
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
    
    public List<PrayerInteractionResponse> getInteractionsByPrayerRequest(UUID prayerRequestId) {
        // Verify prayer request exists
        prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        List<PrayerInteraction> interactions = prayerInteractionRepository
            .findByPrayerRequestIdOrderByTimestampDesc(prayerRequestId);
        
        return interactions.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public Page<PrayerInteractionResponse> getInteractionsByPrayerRequest(UUID prayerRequestId, int page, int size) {
        // Verify prayer request exists
        PrayerRequest prayerRequest = prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerInteraction> interactions = prayerInteractionRepository
            .findByPrayerRequestOrderByTimestampDesc(prayerRequest, pageable);
        
        return interactions.map(PrayerInteractionResponse::fromPrayerInteraction);
    }
    
    public List<PrayerInteractionResponse> getCommentsByPrayerRequest(UUID prayerRequestId) {
        // Verify prayer request exists
        prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        List<PrayerInteraction> comments = prayerInteractionRepository
            .findCommentsByPrayerRequestId(prayerRequestId);
        
        return comments.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public Page<PrayerInteractionResponse> getCommentsByPrayerRequest(UUID prayerRequestId, int page, int size) {
        // Verify prayer request exists
        prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        Pageable pageable = PageRequest.of(page, size);
        Page<PrayerInteraction> comments = prayerInteractionRepository
            .findCommentsByPrayerRequestId(prayerRequestId, pageable);
        
        return comments.map(PrayerInteractionResponse::fromPrayerInteraction);
    }
    
    public List<PrayerInteractionResponse> getReactionsByPrayerRequest(UUID prayerRequestId) {
        // Verify prayer request exists
        prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        List<PrayerInteraction> reactions = prayerInteractionRepository
            .findReactionsByPrayerRequestId(prayerRequestId);
        
        return reactions.stream()
            .map(PrayerInteractionResponse::fromPrayerInteraction)
            .collect(Collectors.toList());
    }
    
    public PrayerInteractionSummary getInteractionSummary(UUID prayerRequestId) {
        // Verify prayer request exists
        prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
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
        
        PrayerRequest prayerRequest = prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new RuntimeException("Prayer request not found with id: " + prayerRequestId));
        
        return prayerInteractionRepository.existsByPrayerRequestAndUserAndType(prayerRequest, user, type);
    }
    
    // Dashboard specific methods
    public List<PrayerInteractionResponse> getRecentInteractionsForDashboard(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        LocalDateTime since = LocalDateTime.now().minusDays(7); // Last 7 days
        List<PrayerInteraction> recentInteractions = prayerInteractionRepository
            .findByTimestampAfterOrderByTimestampDesc(since, pageable);
        
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
     * Send WebSocket notification for prayer interaction
     */
    private void notifyPrayerInteraction(PrayerInteraction interaction) {
        try {
            User user = interaction.getUser();
            PrayerRequest prayerRequest = interaction.getPrayerRequest();
            
            PrayerNotificationEvent event = PrayerNotificationEvent.prayerInteraction(
                prayerRequest.getId(),
                user.getId(),
                user.getEmail(),
                user.getName(),
                interaction.getType(),
                interaction.getContent()
            );
            
            // Broadcast to specific prayer subscribers
            messagingTemplate.convertAndSend("/topic/prayer-interactions/" + prayerRequest.getId(), event);
            
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
}