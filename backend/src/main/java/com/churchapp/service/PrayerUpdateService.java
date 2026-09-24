package com.churchapp.service;

import com.churchapp.dto.PrayerNotificationEvent;
import com.churchapp.dto.PrayerRequestUpdateRequest;
import com.churchapp.dto.PrayerUpdateRequest;
import com.churchapp.dto.PrayerUpdateResponse;
import com.churchapp.entity.Organization;
import com.churchapp.entity.PrayerRequest;
import com.churchapp.entity.PrayerUpdate;
import com.churchapp.entity.User;
import com.churchapp.exception.PrayerAccessDeniedException;
import com.churchapp.exception.PrayerNotFoundException;
import com.churchapp.repository.PrayerRequestRepository;
import com.churchapp.repository.PrayerUpdateRepository;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * The owner's timeline on a prayer: dated notes on how things are going,
 * optionally moving the prayer to a new status at the same time.
 *
 * Only the owner writes updates; anyone in the prayer's church reads them.
 * Anonymous prayers keep their author hidden in the updates too.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class PrayerUpdateService {

    private final PrayerUpdateRepository prayerUpdateRepository;
    private final PrayerRequestRepository prayerRequestRepository;
    private final UserRepository userRepository;
    private final PrayerAccessPolicy prayerAccessPolicy;
    private final PrayerRequestService prayerRequestService;
    private final SimpMessagingTemplate messagingTemplate;

    public PrayerUpdateResponse addUpdate(UUID prayerRequestId, UUID userId, PrayerUpdateRequest request) {
        PrayerRequest prayer = requirePrayer(prayerRequestId);
        User author = requireUser(userId);
        if (!prayer.getUser().getId().equals(userId)) {
            throw new PrayerAccessDeniedException("Only the person who shared this prayer can post updates");
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new IllegalArgumentException("Update text is required");
        }

        // A status change rides along through the regular update path, so the
        // owner check and the "answered" broadcast stay in one place.
        PrayerRequest.PrayerStatus recordedStatus = null;
        if (request.getNewStatus() != null && request.getNewStatus() != prayer.getStatus()) {
            PrayerRequestUpdateRequest statusChange = new PrayerRequestUpdateRequest();
            statusChange.setStatus(request.getNewStatus());
            prayerRequestService.updatePrayerRequest(prayerRequestId, userId, statusChange);
            recordedStatus = request.getNewStatus();
        }

        PrayerUpdate update = new PrayerUpdate();
        update.setPrayerRequest(prayer);
        update.setAuthor(author);
        update.setContent(content);
        update.setNewStatus(recordedStatus);
        PrayerUpdate saved = prayerUpdateRepository.save(update);
        log.info("Prayer update {} added to prayer {} by owner {}", saved.getId(), prayerRequestId, userId);

        notifyPrayerUpdate(saved);
        return PrayerUpdateResponse.from(saved, true);
    }

    @Transactional(readOnly = true)
    public List<PrayerUpdateResponse> getUpdates(UUID prayerRequestId, UUID viewerId) {
        PrayerRequest prayer = requirePrayer(prayerRequestId);
        prayerAccessPolicy.assertCanView(prayer, viewerId);
        boolean viewerIsOwner = prayer.getUser().getId().equals(viewerId);

        return prayerUpdateRepository.findByPrayerRequestIdOrderByCreatedAtDesc(prayerRequestId).stream()
            .map(update -> PrayerUpdateResponse.from(update, viewerIsOwner))
            .collect(Collectors.toList());
    }

    public void deleteUpdate(UUID prayerRequestId, UUID updateId, UUID userId) {
        PrayerUpdate update = prayerUpdateRepository.findById(updateId)
            .filter(u -> u.getPrayerRequest().getId().equals(prayerRequestId))
            .orElseThrow(() -> new PrayerNotFoundException("Update not found with id: " + updateId));

        if (!update.getPrayerRequest().getUser().getId().equals(userId)) {
            throw new PrayerAccessDeniedException("Only the person who shared this prayer can remove its updates");
        }
        prayerUpdateRepository.delete(update);
        log.info("Prayer update {} removed from prayer {} by owner {}", updateId, prayerRequestId, userId);
    }

    /**
     * Tell the church (for the notification bell) and anyone with this prayer
     * open (so the timeline refreshes). Both topics are church-gated on subscribe.
     */
    private void notifyPrayerUpdate(PrayerUpdate update) {
        try {
            PrayerRequest prayer = update.getPrayerRequest();
            PrayerNotificationEvent event = PrayerNotificationEvent.prayerUpdate(update);

            Organization organization = prayer.getOrganization();
            if (organization != null) {
                messagingTemplate.convertAndSend(PrayerTopics.organizationPrayers(organization.getId()), event);
            }
            messagingTemplate.convertAndSend(PrayerTopics.prayerInteractions(prayer.getId()), event);
        } catch (Exception e) {
            log.error("Error broadcasting prayer update for prayer {}: {}",
                update.getPrayerRequest().getId(), e.getMessage());
        }
    }

    private PrayerRequest requirePrayer(UUID prayerRequestId) {
        return prayerRequestRepository.findById(prayerRequestId)
            .orElseThrow(() -> new PrayerNotFoundException("Prayer request not found with id: " + prayerRequestId));
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
    }
}
