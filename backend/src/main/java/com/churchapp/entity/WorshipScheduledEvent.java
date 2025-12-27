package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Represents a scheduled live event for a worship room.
 * Used to track YouTube live streams with scheduling, auto-start, and auto-close functionality.
 */
@Entity
@Table(name = "worship_scheduled_events", indexes = {
    @Index(name = "idx_scheduled_event_room", columnList = "room_id"),
    @Index(name = "idx_scheduled_event_start", columnList = "scheduled_start"),
    @Index(name = "idx_scheduled_event_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorshipScheduledEvent {

    public enum EventStatus {
        SCHEDULED,  // Event is scheduled but not yet started
        LIVE,       // Event is currently live
        ENDED,      // Event has ended
        CANCELLED   // Event was cancelled
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", referencedColumnName = "id", nullable = false)
    private WorshipRoom room;

    @NotBlank(message = "Event title is required")
    @Size(min = 2, max = 200, message = "Event title must be between 2 and 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @NotBlank(message = "Stream URL is required")
    @Size(max = 500, message = "Stream URL must be at most 500 characters")
    @Column(name = "stream_url", nullable = false, length = 500)
    private String streamUrl;

    @Column(name = "scheduled_start", nullable = false)
    private LocalDateTime scheduledStart;

    @Column(name = "scheduled_end")
    private LocalDateTime scheduledEnd;

    @Column(name = "actual_start")
    private LocalDateTime actualStart;

    @Column(name = "actual_end")
    private LocalDateTime actualEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private EventStatus status = EventStatus.SCHEDULED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Helper methods
    public boolean isScheduled() {
        return status == EventStatus.SCHEDULED;
    }

    public boolean isLive() {
        return status == EventStatus.LIVE;
    }

    public boolean isEnded() {
        return status == EventStatus.ENDED;
    }

    public boolean isCancelled() {
        return status == EventStatus.CANCELLED;
    }

    public void goLive() {
        this.status = EventStatus.LIVE;
        this.actualStart = LocalDateTime.now();
    }

    public void end() {
        this.status = EventStatus.ENDED;
        this.actualEnd = LocalDateTime.now();
    }

    public void cancel() {
        this.status = EventStatus.CANCELLED;
    }

    public boolean shouldAutoStart() {
        if (status != EventStatus.SCHEDULED) return false;
        if (scheduledStart == null) return false;
        return LocalDateTime.now().isAfter(scheduledStart) || LocalDateTime.now().isEqual(scheduledStart);
    }

    public boolean shouldAutoEnd() {
        if (status != EventStatus.LIVE) return false;
        if (scheduledEnd == null) return false;
        return LocalDateTime.now().isAfter(scheduledEnd);
    }

    public boolean isCreator(User user) {
        return createdBy != null && createdBy.equals(user);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorshipScheduledEvent that = (WorshipScheduledEvent) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
