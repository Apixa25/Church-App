package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "profile_views", indexes = {
    @Index(name = "idx_profile_views_viewed_user", columnList = "viewed_user_id, viewed_at"),
    @Index(name = "idx_profile_views_viewer", columnList = "viewer_id, viewed_at"),
    @Index(name = "idx_profile_views_viewed_at", columnList = "viewed_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfileView {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "viewer_id", nullable = false)
    private UUID viewerId;

    @Column(name = "viewed_user_id", nullable = false)
    private UUID viewedUserId;

    @CreationTimestamp
    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;

    @Column(name = "is_anonymous", nullable = false)
    private Boolean isAnonymous = false;
}

