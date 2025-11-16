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

    public Page<User> getDmCandidatesForUser(UUID requesterId,
                                             String query,
                                             Pageable pageable) {
        UUID primaryOrgId = userRepository.findPrimaryOrgIdByUserId(requesterId);
        if (primaryOrgId == null) {
            return Page.empty(pageable);
        }
        String qLike = (query == null || query.isBlank()) ? null : ("%" + query.toLowerCase() + "%");
        return userRepository.findOrgMembersForDm(primaryOrgId, requesterId, qLike, pageable);
    }
}


