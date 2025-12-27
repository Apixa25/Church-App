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
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Represents a reusable worship playlist that can be used as a template for rooms.
 * Users can create playlists with curated worship videos that others can start and experience.
 */
@Entity
@Table(name = "worship_playlists", indexes = {
    @Index(name = "idx_worship_playlist_created_by", columnList = "created_by"),
    @Index(name = "idx_worship_playlist_is_public", columnList = "is_public"),
    @Index(name = "idx_worship_playlist_is_active", columnList = "is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaylist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @NotBlank(message = "Playlist name is required")
    @Size(min = 2, max = 100, message = "Playlist name must be between 2 and 100 characters")
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "id", nullable = false)
    private User createdBy;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic = true;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "total_duration")
    private Integer totalDuration = 0; // Total duration in seconds

    @Column(name = "video_count")
    private Integer videoCount = 0;

    @Column(name = "play_count")
    private Integer playCount = 0; // Number of times this playlist has been started

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Relationship to playlist entries
    @OneToMany(mappedBy = "playlist", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("position ASC")
    private List<WorshipPlaylistEntry> entries = new ArrayList<>();

    // Helper methods
    public boolean isCreator(User user) {
        return createdBy != null && createdBy.equals(user);
    }

    public void addEntry(WorshipPlaylistEntry entry) {
        entries.add(entry);
        entry.setPlaylist(this);
        updateCounts();
    }

    public void removeEntry(WorshipPlaylistEntry entry) {
        entries.remove(entry);
        entry.setPlaylist(null);
        updateCounts();
    }

    public void updateCounts() {
        this.videoCount = entries.size();
        this.totalDuration = entries.stream()
            .mapToInt(e -> e.getVideoDuration() != null ? e.getVideoDuration() : 0)
            .sum();
    }

    public void incrementPlayCount() {
        this.playCount = (this.playCount != null ? this.playCount : 0) + 1;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorshipPlaylist that = (WorshipPlaylist) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
