package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Represents an animated avatar that users can select for worship rooms.
 * Each avatar is a sprite sheet with animation properties for CSS-based animation.
 * Inspired by plug.dj's dancing avatar system.
 */
@Entity
@Table(name = "worship_avatars", indexes = {
    @Index(name = "idx_worship_avatar_active", columnList = "is_active"),
    @Index(name = "idx_worship_avatar_sort", columnList = "sort_order")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorshipAvatar {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "description", length = 200)
    private String description;

    @Column(name = "sprite_sheet_url", nullable = false, length = 500)
    private String spriteSheetUrl;

    /**
     * Number of animation frames in the sprite sheet.
     * The sprite sheet is a horizontal strip where totalWidth = frameCount * frameWidth
     */
    @Column(name = "frame_count", nullable = false)
    private Integer frameCount = 8;

    /**
     * Width of each frame in pixels
     */
    @Column(name = "frame_width", nullable = false)
    private Integer frameWidth = 64;

    /**
     * Height of each frame in pixels
     */
    @Column(name = "frame_height", nullable = false)
    private Integer frameHeight = 64;

    /**
     * Duration of one complete animation cycle in milliseconds.
     * Lower = faster animation.
     */
    @Column(name = "animation_duration_ms", nullable = false)
    private Integer animationDurationMs = 800;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Calculate the total width of the sprite sheet
     */
    public int getTotalSpriteWidth() {
        return frameCount * frameWidth;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorshipAvatar that = (WorshipAvatar) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
