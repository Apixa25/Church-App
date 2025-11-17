package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_views", indexes = {
    @Index(name = "idx_post_views_post", columnList = "post_id, viewed_at"),
    @Index(name = "idx_post_views_viewer", columnList = "viewer_id, viewed_at"),
    @Index(name = "idx_post_views_viewed_at", columnList = "viewed_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostView {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "post_id", nullable = false)
    private UUID postId;

    @Column(name = "viewer_id")
    private UUID viewerId; // Nullable for anonymous views

    @CreationTimestamp
    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;

    @Column(name = "time_spent_seconds", nullable = false)
    private Integer timeSpentSeconds = 0;
}

