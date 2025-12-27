package com.churchapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Represents a single video entry in a worship playlist.
 * Entries are ordered by position and contain YouTube video metadata.
 */
@Entity
@Table(name = "worship_playlist_entries", indexes = {
    @Index(name = "idx_playlist_entry_playlist", columnList = "playlist_id"),
    @Index(name = "idx_playlist_entry_position", columnList = "position")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorshipPlaylistEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "playlist_id", referencedColumnName = "id", nullable = false)
    private WorshipPlaylist playlist;

    @NotBlank(message = "Video ID is required")
    @Size(max = 100, message = "Video ID must be at most 100 characters")
    @Column(name = "video_id", nullable = false, length = 100)
    private String videoId;

    @NotBlank(message = "Video title is required")
    @Size(max = 500, message = "Video title must be at most 500 characters")
    @Column(name = "video_title", nullable = false, length = 500)
    private String videoTitle;

    @Column(name = "video_duration")
    private Integer videoDuration; // Duration in seconds

    @Column(name = "video_thumbnail_url", length = 500)
    private String videoThumbnailUrl;

    @Column(name = "position", nullable = false)
    private Integer position;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "added_by", referencedColumnName = "id", nullable = false)
    private User addedBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Helper method to check if user can edit this entry
    public boolean canBeEditedBy(User user) {
        return addedBy != null && addedBy.equals(user);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorshipPlaylistEntry that = (WorshipPlaylistEntry) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
