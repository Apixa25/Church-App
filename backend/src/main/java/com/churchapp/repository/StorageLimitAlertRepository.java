package com.churchapp.repository;

import com.churchapp.entity.StorageLimitAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface StorageLimitAlertRepository extends JpaRepository<StorageLimitAlert, UUID> {

    Optional<StorageLimitAlert> findTopByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);
}

