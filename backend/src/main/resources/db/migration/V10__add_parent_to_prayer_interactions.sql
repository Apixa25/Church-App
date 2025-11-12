ALTER TABLE prayer_interactions
    ADD COLUMN parent_interaction_id UUID;

ALTER TABLE prayer_interactions
    ADD CONSTRAINT fk_prayer_interaction_parent
        FOREIGN KEY (parent_interaction_id)
        REFERENCES prayer_interactions (id)
        ON DELETE CASCADE;

CREATE INDEX idx_prayer_interaction_parent_id
    ON prayer_interactions (parent_interaction_id);

