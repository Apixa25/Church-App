package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_likes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostLike implements Serializable {

    @EmbeddedId
    private PostLikeId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostLikeId implements Serializable {

        @Column(name = "post_id")
        private UUID postId;

        @Column(name = "user_id")
        private UUID userId;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            PostLikeId that = (PostLikeId) o;

            if (!postId.equals(that.postId)) return false;
            return userId.equals(that.userId);
        }

        @Override
        public int hashCode() {
            int result = postId.hashCode();
            result = 31 * result + userId.hashCode();
            return result;
        }
    }
}
