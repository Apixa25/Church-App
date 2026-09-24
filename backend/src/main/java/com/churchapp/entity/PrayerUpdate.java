package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * One dated note on a prayer's timeline, written by the prayer's owner
 * ("Surgery went well — home Friday"). Optionally records a status change
 * made at the same time so the timeline can read "marked as Answered".
 */
@Entity
@Table(name = "prayer_updates", indexes = {
    @Index(name = "idx_prayer_updates_prayer_created", columnList = "prayer_id, created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrayerUpdate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prayer_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private PrayerRequest prayerRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User author;

    @NotBlank
    @Size(max = 2000)
    @Column(name = "content", nullable = false, length = 2000)
    private String content;

    /** Status the prayer was moved to as part of this update, or null for a plain note. */
    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", length = 32)
    private PrayerRequest.PrayerStatus newStatus;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
