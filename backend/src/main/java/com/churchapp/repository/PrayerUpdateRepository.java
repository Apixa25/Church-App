package com.churchapp.repository;

import com.churchapp.entity.PrayerUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrayerUpdateRepository extends JpaRepository<PrayerUpdate, UUID> {

    List<PrayerUpdate> findByPrayerRequestIdOrderByCreatedAtDesc(UUID prayerRequestId);

    long countByPrayerRequestId(UUID prayerRequestId);
}
