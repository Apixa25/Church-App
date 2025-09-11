package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "event_rsvps", indexes = {
    @Index(name = "idx_rsvp_event_id", columnList = "event_id"),
    @Index(name = "idx_rsvp_user_id", columnList = "user_id"),
    @Index(name = "idx_rsvp_response", columnList = "response"),
    @Index(name = "idx_rsvp_timestamp", columnList = "timestamp")
})
@IdClass(EventRsvpId.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRsvp {
    
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, referencedColumnName = "id")
    private User user;
    
    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false, referencedColumnName = "id")
    private Event event;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "response", nullable = false)
    private RsvpResponse response;
    
    @Column(name = "guest_count")
    private Integer guestCount = 0;
    
    @Column(name = "notes", length = 500)
    private String notes;
    
    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public enum RsvpResponse {
        YES,
        NO,
        MAYBE
    }
}