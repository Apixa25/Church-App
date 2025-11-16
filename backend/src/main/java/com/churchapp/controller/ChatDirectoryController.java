package com.churchapp.controller;

import com.churchapp.dto.UserProfileResponse;
import com.churchapp.entity.User;
import com.churchapp.repository.UserRepository;
import com.churchapp.service.ChatDirectoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/chats")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:8100", "capacitor://localhost"})
public class ChatDirectoryController {

    private final UserRepository userRepository;
    private final ChatDirectoryService chatDirectoryService;

    private UUID resolveUserId(UserDetails securityUser) {
        return userRepository.findByEmail(securityUser.getUsername())
            .map(User::getId)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/dm-candidates")
    public ResponseEntity<Page<UserProfileResponse>> getDmCandidates(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = resolveUserId(userDetails);
        Page<User> results = chatDirectoryService.getDmCandidatesForUser(
            userId, q, PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"))
        );

        Page<UserProfileResponse> mapped = results.map(UserProfileResponse::fromUser);
        return ResponseEntity.ok(mapped);
    }
}


