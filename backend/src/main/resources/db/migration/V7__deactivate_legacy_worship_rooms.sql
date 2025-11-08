-- Deactivate legacy worship rooms created during early testing
UPDATE worship_rooms
SET is_active = FALSE,
    updated_at = NOW()
WHERE name IN ('Test Room', 'Worship The Lord with MAGNUS!');

