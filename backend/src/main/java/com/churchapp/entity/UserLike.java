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
@Table(name = "user_likes", indexes = {
    @Index(name = "idx_user_like_liked_user", columnList = "liked_user_id"),
    @Index(name = "idx_user_like_user", columnList = "user_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserLike implements Serializable {

    @EmbeddedId
    private UserLikeId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserLikeId implements Serializable {

        @Column(name = "user_id")
        private UUID userId; // User who gave the heart

        @Column(name = "liked_user_id")
        private UUID likedUserId; // User who received the heart

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            UserLikeId that = (UserLikeId) o;

            if (!userId.equals(that.userId)) return false;
            return likedUserId.equals(that.likedUserId);
        }

        @Override
        public int hashCode() {
            int result = userId.hashCode();
            result = 31 * result + likedUserId.hashCode();
            return result;
        }
    }
}

