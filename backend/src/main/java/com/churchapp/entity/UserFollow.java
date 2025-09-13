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
@Table(name = "user_follows", indexes = {
    @Index(name = "idx_user_follows_follower_id", columnList = "follower_id"),
    @Index(name = "idx_user_follows_following_id", columnList = "following_id"),
    @Index(name = "idx_user_follows_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserFollow implements Serializable {

    @EmbeddedId
    private UserFollowId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserFollowId implements Serializable {

        @Column(name = "follower_id")
        private UUID followerId;

        @Column(name = "following_id")
        private UUID followingId;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            UserFollowId that = (UserFollowId) o;

            if (!followerId.equals(that.followerId)) return false;
            return followingId.equals(that.followingId);
        }

        @Override
        public int hashCode() {
            int result = followerId.hashCode();
            result = 31 * result + followingId.hashCode();
            return result;
        }
    }

    // Helper method to check if users are following each other (mutual)
    public boolean isMutual(UserFollow other) {
        return this.id.followerId.equals(other.id.followingId) &&
               this.id.followingId.equals(other.id.followerId);
    }
}
