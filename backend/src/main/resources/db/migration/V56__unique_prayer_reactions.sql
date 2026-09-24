-- One reaction of each type per user per prayer.
--
-- PrayerInteractionService toggles reactions with find-then-insert. Two quick
-- taps could race past the find and insert two PRAY rows; the next tap would
-- remove only one, leaving a phantom count. This index makes the database the
-- final arbiter. Comments are excluded: a user may leave many comments.

-- 1. Remove existing duplicates, keeping the earliest row of each group.
--    Replies that point at a duplicate are impossible (only comments have
--    replies), so this is safe to delete directly.
DELETE FROM prayer_interactions pi
USING prayer_interactions keep
WHERE pi.type <> 'COMMENT'
  AND keep.type <> 'COMMENT'
  AND pi.prayer_id = keep.prayer_id
  AND pi.user_id   = keep.user_id
  AND pi.type      = keep.type
  AND (keep.timestamp < pi.timestamp
       OR (keep.timestamp = pi.timestamp AND keep.id < pi.id));

-- 2. Enforce uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS uq_prayer_reaction_per_user
    ON prayer_interactions (prayer_id, user_id, type)
    WHERE type <> 'COMMENT';
