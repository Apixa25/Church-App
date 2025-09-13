package com.churchapp.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "post_hashtags", indexes = {
    @Index(name = "idx_post_hashtags_post_id", columnList = "post_id"),
    @Index(name = "idx_post_hashtags_hashtag_id", columnList = "hashtag_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostHashtag implements Serializable {

    @EmbeddedId
    private PostHashtagId id;

    @Embeddable
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostHashtagId implements Serializable {

        @Column(name = "post_id")
        private UUID postId;

        @Column(name = "hashtag_id")
        private UUID hashtagId;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;

            PostHashtagId that = (PostHashtagId) o;

            if (!postId.equals(that.postId)) return false;
            return hashtagId.equals(that.hashtagId);
        }

        @Override
        public int hashCode() {
            int result = postId.hashCode();
            result = 31 * result + hashtagId.hashCode();
            return result;
        }
    }
}
