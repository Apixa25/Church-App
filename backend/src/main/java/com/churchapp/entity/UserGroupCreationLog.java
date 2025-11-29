package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_group_creation_log",
    indexes = {
        @Index(name = "idx_user_group_creation_user_id", columnList = "user_id"),
        @Index(name = "idx_user_group_creation_created_at", columnList = "created_at"),
        @Index(name = "idx_user_group_creation_user_date", columnList = "user_id, created_at")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserGroupCreationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}

