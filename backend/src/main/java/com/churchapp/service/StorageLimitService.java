package com.churchapp.service;

import com.churchapp.entity.Organization;
import com.churchapp.entity.OrganizationMetrics;
import com.churchapp.entity.StorageLimitAlert;
import com.churchapp.repository.OrganizationMetricsRepository;
import com.churchapp.repository.OrganizationRepository;
import com.churchapp.repository.StorageLimitAlertRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class StorageLimitService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMetricsRepository organizationMetricsRepository;
    private final StorageLimitAlertRepository storageLimitAlertRepository;

    private static final int DEFAULT_ALERT_THRESHOLD = 80;

    public void evaluateStorageLimits() {
        List<OrganizationMetrics> metricsList = organizationMetricsRepository.findAll();

        for (OrganizationMetrics metrics : metricsList) {
            Organization organization = metrics.getOrganization();
            if (organization == null || organization.getDeletedAt() != null) {
                continue;
            }

            Long limitBytes = organization.getStorageLimitBytes();
            if (limitBytes == null || limitBytes <= 0) {
                organization.setStorageLimitStatus(Organization.StorageLimitStatus.OK);
                organization.setStorageLimitNotified(false);
                continue;
            }

            long storageUsed = Optional.ofNullable(metrics.getStorageUsed()).orElse(0L);
            int usagePercent = (int) Math.min(100, Math.round((storageUsed * 100.0) / limitBytes));
            int alertThreshold = Optional.ofNullable(organization.getStorageAlertThreshold())
                    .orElse(DEFAULT_ALERT_THRESHOLD);

            Organization.StorageLimitStatus status = determineStatus(usagePercent, alertThreshold);
            Organization.StorageLimitStatus previousStatus = organization.getStorageLimitStatus();

            organization.setStorageLimitStatus(status);

            if (status == Organization.StorageLimitStatus.OK) {
                organization.setStorageLimitNotified(false);
            }

            if (shouldTriggerAlert(status, previousStatus, organization)) {
                createAlert(organization, storageUsed, limitBytes, usagePercent, status);
                organization.setStorageLimitNotified(true);
            }
        }
    }

    public StorageLimitInfo getStorageLimit(UUID organizationId) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found: " + organizationId));

        Long limitBytes = Optional.ofNullable(organization.getStorageLimitBytes()).orElse(0L);
        int threshold = Optional.ofNullable(organization.getStorageAlertThreshold())
                .orElse(DEFAULT_ALERT_THRESHOLD);

        long storageUsed = organizationMetricsRepository.findByOrganizationId(organizationId)
                .map(metrics -> Optional.ofNullable(metrics.getStorageUsed()).orElse(0L))
                .orElse(0L);

        Integer usagePercent = null;
        if (limitBytes != null && limitBytes > 0) {
            usagePercent = (int) Math.min(100, Math.round((storageUsed * 100.0) / limitBytes));
        }

        return new StorageLimitInfo(
                organizationId,
                limitBytes,
                threshold,
                storageUsed,
                usagePercent,
                organization.getStorageLimitStatus(),
                organization.getStorageLimitNotified()
        );
    }

    public StorageLimitInfo updateStorageLimit(UUID organizationId, Long limitBytes, Integer alertThreshold) {
        Organization organization = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new RuntimeException("Organization not found: " + organizationId));

        organization.setStorageLimitBytes(limitBytes != null && limitBytes > 0 ? limitBytes : null);
        if (alertThreshold != null && alertThreshold >= 50 && alertThreshold <= 99) {
            organization.setStorageAlertThreshold(alertThreshold);
        }

        organization.setStorageLimitStatus(Organization.StorageLimitStatus.OK);
        organization.setStorageLimitNotified(false);

        organizationRepository.save(organization);

        return getStorageLimit(organizationId);
    }

    private Organization.StorageLimitStatus determineStatus(int percent, int alertThreshold) {
        if (percent >= 100) {
            return Organization.StorageLimitStatus.OVER_LIMIT;
        }
        int criticalThreshold = Math.min(99, Math.max(alertThreshold + 10, 95));
        if (percent >= criticalThreshold) {
            return Organization.StorageLimitStatus.CRITICAL;
        }
        if (percent >= alertThreshold) {
            return Organization.StorageLimitStatus.WARNING;
        }
        return Organization.StorageLimitStatus.OK;
    }

    private boolean shouldTriggerAlert(Organization.StorageLimitStatus status,
                                       Organization.StorageLimitStatus previousStatus,
                                       Organization organization) {
        if (status == Organization.StorageLimitStatus.OK) {
            return false;
        }

        if (!Boolean.TRUE.equals(organization.getStorageLimitNotified())) {
            return true;
        }

        // Trigger if status severity increased
        return status != previousStatus;
    }

    private void createAlert(Organization organization,
                             long storageUsed,
                             long limitBytes,
                             int usagePercent,
                             Organization.StorageLimitStatus status) {

        StorageLimitAlert alert = new StorageLimitAlert();
        alert.setOrganization(organization);
        alert.setAlertLevel(status.name());
        alert.setUsagePercent(usagePercent);
        alert.setStorageUsed(storageUsed);
        alert.setLimitBytes(limitBytes);
        storageLimitAlertRepository.save(alert);

        log.warn("Storage alert for organization {}: status={}, usage={}%, used={}, limit={}",
                organization.getName(), status, usagePercent, storageUsed, limitBytes);
    }

    @Value
    public static class StorageLimitInfo {
        UUID organizationId;
        Long storageLimitBytes;
        Integer storageAlertThreshold;
        Long storageUsed;
        Integer usagePercent;
        Organization.StorageLimitStatus status;
        Boolean alertTriggered;
    }
}

