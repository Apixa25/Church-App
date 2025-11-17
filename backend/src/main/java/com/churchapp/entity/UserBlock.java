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
@Table(name = "user_blocks", indexes = {
    @Index(name = "idx_user_blocks_blocker_id", columnList = "blocker_id"),
    @Index(name = "idx_user_blocks_blocked_id", columnList = "blocked_id"),
    @Index(name = "idx_user_blocks_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserBlock implements Serializable {

    @EmbeddedId
    private UserBlockId id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserBlockId implements Serializable {

        @Column(name = "blocker_id")
        private UUID blockerId;

        @Column(name = "blocked_id")
        private UUID blockedId;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            UserBlockId that = (UserBlockId) o;

            if (!blockerId.equals(that.blockerId)) return false;
            return blockedId.equals(that.blockedId);
        }

        @Override
        public int hashCode() {
            int result = blockerId.hashCode();
            result = 31 * result + blockedId.hashCode();
            return result;
        }
    }
}

