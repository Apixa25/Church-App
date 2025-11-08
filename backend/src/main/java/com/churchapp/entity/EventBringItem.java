package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "event_bring_items", indexes = {
    @Index(name = "idx_event_bring_items_event_id", columnList = "event_id"),
    @Index(name = "idx_event_bring_items_created_by", columnList = "created_by")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventBringItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false, referencedColumnName = "id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Event event;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "quantity_needed")
    private Integer quantityNeeded;

    @Builder.Default
    @Column(name = "allow_multiple_claims", nullable = false)
    private Boolean allowMultipleClaims = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User createdBy;

    @Builder.Default
    @OneToMany(mappedBy = "item", cascade = CascadeType.ALL, orphanRemoval = true)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<EventBringClaim> claims = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void addClaim(EventBringClaim claim) {
        if (claims == null) {
            claims = new ArrayList<>();
        }
        claims.add(claim);
        claim.setItem(this);
    }
}

