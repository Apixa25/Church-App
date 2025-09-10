package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prayer_interactions", indexes = {
    @Index(name = "idx_prayer_interaction_prayer_id", columnList = "prayer_id"),
    @Index(name = "idx_prayer_interaction_user_id", columnList = "user_id"),
    @Index(name = "idx_prayer_interaction_type", columnList = "type"),
    @Index(name = "idx_prayer_interaction_timestamp", columnList = "timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PrayerInteraction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prayer_id", nullable = false, referencedColumnName = "id")
    private PrayerRequest prayerRequest;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, referencedColumnName = "id")
    private User user;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private InteractionType type;
    
    @Size(max = 1000, message = "Interaction content cannot exceed 1000 characters")
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;
    
    @CreationTimestamp
    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;
    
    public enum InteractionType {
        PRAY,           // "I'm praying for this" reaction
        COMMENT,        // Text comment on the prayer
        ENCOURAGE,      // Encouraging reaction
        AMEN,          // "Amen" reaction
        HEART,         // Heart/love reaction
        PRAISE         // Praise/celebration reaction (for answered prayers)
    }
}