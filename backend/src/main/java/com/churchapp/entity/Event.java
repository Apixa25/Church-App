package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "events", indexes = {
    @Index(name = "idx_event_creator_id", columnList = "creator_id"),
    @Index(name = "idx_event_group_id", columnList = "group_id"),
    @Index(name = "idx_event_start_time", columnList = "start_time"),
    @Index(name = "idx_event_end_time", columnList = "end_time"),
    @Index(name = "idx_event_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @NotBlank(message = "Event title is required")
    @Size(min = 3, max = 200, message = "Event title must be between 3 and 200 characters")
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Size(max = 2000, message = "Event description cannot exceed 2000 characters")
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @NotNull(message = "Event start time is required")
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;
    
    @Column(name = "end_time")
    private LocalDateTime endTime;
    
    @Size(max = 500, message = "Location cannot exceed 500 characters")
    @Column(name = "location", length = 500)
    private String location;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false, referencedColumnName = "id")
    private User creator;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", referencedColumnName = "id")
    private ChatGroup group;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EventStatus status = EventStatus.SCHEDULED;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private EventCategory category = EventCategory.GENERAL;
    
    @Column(name = "max_attendees")
    private Integer maxAttendees;
    
    @Column(name = "is_recurring", nullable = false)
    private Boolean isRecurring = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "recurrence_type")
    private RecurrenceType recurrenceType;
    
    @Column(name = "recurrence_end_date")
    private LocalDateTime recurrenceEndDate;
    
    @Column(name = "requires_approval", nullable = false)
    private Boolean requiresApproval = false;
    
    @Column(name = "bring_list_enabled", nullable = false)
    private Boolean bringListEnabled = false;
    
    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<EventBringItem> bringItems = new ArrayList<>();
    
    @Column(name = "original_category")
    private String originalCategory;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public enum EventStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        POSTPONED
    }
    
    public enum EventCategory {
        GENERAL,
        WORSHIP,
        BIBLE_STUDY,
        PRAYER,
        FELLOWSHIP,
        OUTREACH,
        YOUTH,
        CHILDREN,
        MENS,
        WOMENS,
        SENIORS,
        MISSIONS,
        MINISTRY,
        SOCIAL,
        EDUCATION,
        MUSIC,
        OTHER,
        // Legacy values for backward compatibility
        MENS_MINISTRY,
        WOMENS_MINISTRY,
        SPECIAL_EVENT,
        MEETING,
        VOLUNTEER
    }
    
    public enum RecurrenceType {
        DAILY,
        WEEKLY,
        MONTHLY,
        YEARLY
    }
}