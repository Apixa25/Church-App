package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email"),
    @Index(name = "idx_user_google_id", columnList = "google_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    @Column(name = "email", unique = true, nullable = false, length = 255)
    private String email;
    
    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Column(name = "name", nullable = false, length = 100)
    private String name;
    
    @Column(name = "profile_pic_url", length = 500)
    private String profilePicUrl;
    
    @Column(name = "banner_image_url", length = 500)
    private String bannerImageUrl;
    
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;
    
    @Column(name = "location", length = 255)
    private String location;
    
    @Column(name = "website", length = 500)
    private String website;
    
    @Column(name = "interests", columnDefinition = "TEXT")
    private String interests; // JSON string of interests array
    
    @Column(name = "phone_number", length = 20)
    private String phoneNumber;
    
    @Column(name = "address", length = 500)
    private String address;
    
    @Column(name = "birthday")
    private LocalDate birthday;
    
    @Column(name = "spiritual_gift", length = 255)
    private String spiritualGift;
    
    @Column(name = "equipping_gifts", length = 255)
    private String equippingGifts;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role = Role.MEMBER;
    
    @Column(name = "google_id", length = 255)
    private String googleId;
    
    @Column(name = "password_hash", length = 255)
    private String passwordHash;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Admin/Moderation fields
    @Column(name = "is_banned", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE NOT NULL")
    private boolean isBanned = false;

    @Column(name = "ban_reason", columnDefinition = "TEXT")
    private String banReason;

    @Column(name = "banned_at")
    private LocalDateTime bannedAt;

    @Column(name = "warning_count", nullable = false, columnDefinition = "INT DEFAULT 0 NOT NULL")
    private int warningCount = 0;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // Donation relationships
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Donation> donations = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<DonationSubscription> donationSubscriptions = new ArrayList<>();

    public enum Role {
        MEMBER, MODERATOR, ADMIN
    }
}