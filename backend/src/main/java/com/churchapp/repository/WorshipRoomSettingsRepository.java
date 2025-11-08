package com.churchapp.repository;

import com.churchapp.entity.WorshipRoom;
import com.churchapp.entity.WorshipRoomSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorshipRoomSettingsRepository extends JpaRepository<WorshipRoomSettings, UUID> {

    // Find settings by worship room
    Optional<WorshipRoomSettings> findByWorshipRoom(WorshipRoom worshipRoom);

    // Check if settings exist for room
    boolean existsByWorshipRoom(WorshipRoom worshipRoom);
}
