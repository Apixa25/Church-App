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
    
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role = UserRole.MEMBER;
    
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
    
    public enum UserRole {
        MEMBER, MODERATOR, ADMIN
    }
}