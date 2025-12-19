package com.churchapp.service;

import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatDirectoryService {

    private final UserRepository userRepository;

    public Page<User> getDmCandidates(UUID requesterId,
                                      UUID requesterPrimaryOrgId,
                                      String query,
                                      Pageable pageable) {
        if (requesterPrimaryOrgId == null) {
            return Page.empty(pageable);
        }
        String q = (query == null || query.isBlank()) ? null : query;
        return userRepository.findOrgMembersForDm(requesterPrimaryOrgId, requesterId, q, pageable);
    }

    /**
     * Get DM candidates from user's church primary AND family primary organizations.
     * Returns combined list from BOTH organizations, enabling the Directory feature
     * to show all relevant contacts across church and family contexts.
     */
    public Page<User> getDmCandidatesForUser(UUID requesterId,
                                             String query,
                                             Pageable pageable) {
        // Fetch BOTH organization IDs
        UUID churchOrgId = userRepository.findChurchPrimaryOrgIdByUserId(requesterId);
        UUID familyOrgId = userRepository.findFamilyPrimaryOrgIdByUserId(requesterId);

        // If user has no primary organizations, return empty
        if (churchOrgId == null && familyOrgId == null) {
            return Page.empty(pageable);
        }

        // Prepare search query with wildcard
        String qLike = (query == null || query.isBlank()) ? null : ("%" + query.toLowerCase() + "%");

        // Single query fetching from both organizations
        return userRepository.findDirectoryMembers(churchOrgId, familyOrgId, requesterId, qLike, pageable);
    }
}


