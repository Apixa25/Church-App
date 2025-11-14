package com.churchapp.repository;

import com.churchapp.entity.FeedPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeedPreferenceRepository extends JpaRepository<FeedPreference, UUID> {

    @Query("SELECT f FROM FeedPreference f WHERE f.user.id = :userId")
    Optional<FeedPreference> findByUserId(@Param("userId") UUID userId);

    boolean existsByUserId(UUID userId);

    void deleteByUserId(UUID userId);
}
