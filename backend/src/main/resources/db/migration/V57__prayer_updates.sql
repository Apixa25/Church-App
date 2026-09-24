-- Prayer updates: the owner's "here's how it went" timeline on a prayer request.
--
-- Each row is one dated note from the prayer's author (e.g. "Surgery went well,
-- home on Friday"). When an update also changes the prayer's status, the new
-- status is recorded on the row so the timeline can show "marked as Answered".
--
-- ON DELETE CASCADE: updates have no children of their own, so letting the
-- database remove them with the prayer keeps the existing delete flows
-- (owner delete, moderation REMOVE, organization teardown) unchanged.

CREATE TABLE IF NOT EXISTS prayer_updates (
    id          UUID          NOT NULL,
    prayer_id   UUID          NOT NULL,
    author_id   UUID          NOT NULL,
    content     VARCHAR(2000) NOT NULL,
    new_status  VARCHAR(32),
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_prayer_updates PRIMARY KEY (id),
    CONSTRAINT fk_prayer_updates_prayer FOREIGN KEY (prayer_id)
        REFERENCES prayer_requests (id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_updates_author FOREIGN KEY (author_id)
        REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prayer_updates_prayer_created
    ON prayer_updates (prayer_id, created_at DESC);
