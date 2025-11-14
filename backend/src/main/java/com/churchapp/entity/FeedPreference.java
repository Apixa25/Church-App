package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "feed_preferences",
    uniqueConstraints = @UniqueConstraint(name = "uk_feed_preferences_user", columnNames = {"user_id"}),
    indexes = {
        @Index(name = "idx_feed_preferences_user_id", columnList = "user_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "active_filter", nullable = false, length = 30)
    private FeedFilter activeFilter = FeedFilter.ALL;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "selected_group_ids", columnDefinition = "jsonb")
    private List<UUID> selectedGroupIds = new ArrayList<>();

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum FeedFilter {
        ALL,
        PRIMARY_ONLY,
        SELECTED_GROUPS
    }
}
