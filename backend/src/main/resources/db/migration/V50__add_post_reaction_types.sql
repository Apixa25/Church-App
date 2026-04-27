-- V50: Add typed reactions to existing post likes.
-- Existing likes become HEART reactions so current post engagement is preserved.

ALTER TABLE post_likes
    ADD COLUMN reaction_type VARCHAR(32) NOT NULL DEFAULT 'HEART';

CREATE INDEX idx_post_likes_post_reaction_type
    ON post_likes(post_id, reaction_type);
