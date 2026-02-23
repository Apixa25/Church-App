-- Ensure banking outreach metadata remains available for orgs that still need setup.
-- This backfills organizations that were accidentally stripped of metadata.

UPDATE organizations
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{bankingReviewStatus}',
            to_jsonb('PENDING_CONTACT'::text),
            true
        ),
        '{bankingReviewCreatedAt}',
        to_jsonb(COALESCE(metadata->>'bankingReviewCreatedAt', created_at::text)),
        true
    ),
    '{bankingQueueEnteredAt}',
    to_jsonb(
        COALESCE(
            metadata->>'bankingQueueEnteredAt',
            metadata->>'bankingReviewCreatedAt',
            created_at::text
        )
    ),
    true
)
WHERE deleted_at IS NULL
  AND (stripe_connect_account_id IS NULL OR btrim(stripe_connect_account_id) = '')
  AND (
      metadata->>'bankingReviewStatus' IS NULL
      OR btrim(metadata->>'bankingReviewStatus') = ''
  );
