package com.churchapp.service;

import com.churchapp.dto.UserManagementResponse;
import com.churchapp.entity.User;
import com.churchapp.entity.User.Role;
import com.churchapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserManagementService {

    private final UserRepository userRepository;

    public Page<UserManagementResponse> getUsers(Pageable pageable, String search, String role, Boolean banned) {
        Specification<User> spec = createUserSpecification(search, role, banned);
        Page<User> users = userRepository.findAll(spec, pageable);

        return users.map(user -> {
            UserManagementResponse response = UserManagementResponse.fromUser(user);
            // TODO: Add activity metrics from other repositories
            return response;
        });
    }

    public UserManagementResponse getUserDetails(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        UserManagementResponse response = UserManagementResponse.fromUser(user);
        // TODO: Add detailed activity metrics
        return response;
    }

    @Transactional
    public void updateUserRole(UUID userId, String roleName) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        try {
            Role newRole = Role.valueOf(roleName.toUpperCase());
            user.setRole(newRole);
            userRepository.save(user);

            log.info("Updated user {} role to: {}", userId, newRole);

        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role: " + roleName);
        }
    }

    @Transactional
    public void banUser(UUID userId, String reason, String duration) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        user.setBanned(true);
        user.setBanReason(reason);
        user.setBannedAt(LocalDateTime.now());
        user.setActive(false);

        // TODO: Implement duration-based bans if needed
        // For now, all bans are permanent until unbanned

        userRepository.save(user);

        log.info("Banned user {} for reason: {}", userId, reason);
    }

    @Transactional
    public void unbanUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        user.setBanned(false);
        user.setBanReason(null);
        user.setBannedAt(null);
        user.setActive(true);

        userRepository.save(user);

        log.info("Unbanned user {}", userId);
    }

    @Transactional
    public void warnUser(UUID userId, String reason, String message) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        int currentWarnings = user.getWarningCount();
        user.setWarningCount(currentWarnings + 1);

        userRepository.save(user);

        // TODO: Send notification to user about the warning
        // TODO: Implement automatic ban after X warnings if needed

        log.info("Issued warning to user {} (total warnings: {}). Reason: {}",
                userId, user.getWarningCount(), reason);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        // Soft delete - mark as deleted but keep record for audit purposes
        user.setActive(false);
        user.setDeletedAt(LocalDateTime.now());

        userRepository.save(user);

        log.info("Soft deleted user {}", userId);
    }

    private Specification<User> createUserSpecification(String search, String role, Boolean banned) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Only show non-deleted users by default
            predicates.add(criteriaBuilder.isNull(root.get("deletedAt")));

            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                Predicate namePredicate = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("name")), searchPattern);
                Predicate emailPredicate = criteriaBuilder.like(
                    criteriaBuilder.lower(root.get("email")), searchPattern);
                predicates.add(criteriaBuilder.or(namePredicate, emailPredicate));
            }

            if (role != null && !role.trim().isEmpty()) {
                try {
                    Role roleEnum = Role.valueOf(role.toUpperCase());
                    predicates.add(criteriaBuilder.equal(root.get("role"), roleEnum));
                } catch (IllegalArgumentException e) {
                    // Invalid role, ignore filter
                }
            }

            if (banned != null) {
                predicates.add(criteriaBuilder.equal(root.get("isBanned"), banned));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}