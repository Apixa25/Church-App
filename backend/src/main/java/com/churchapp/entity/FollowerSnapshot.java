package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "follower_snapshots", indexes = {
    @Index(name = "idx_follower_snapshots_user", columnList = "user_id, snapshot_date"),
    @Index(name = "idx_follower_snapshots_date", columnList = "snapshot_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowerSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "follower_count", nullable = false)
    private Integer followerCount = 0;

    @Column(name = "following_count", nullable = false)
    private Integer followingCount = 0;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

