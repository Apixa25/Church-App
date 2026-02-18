package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "marketplace_listing_interests", uniqueConstraints = {
    @UniqueConstraint(name = "uk_marketplace_interest_listing_user", columnNames = {"listing_id", "user_id"})
}, indexes = {
    @Index(name = "idx_marketplace_interest_listing", columnList = "listing_id"),
    @Index(name = "idx_marketplace_interest_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketplaceListingInterest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "listing_id", nullable = false)
    private MarketplaceListing listing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
