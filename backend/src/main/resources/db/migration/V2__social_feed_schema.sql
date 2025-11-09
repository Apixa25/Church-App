-- Legacy migration retained for version history
-- All social feed tables are created in V1 for PostgreSQL deployments.

DO $$
BEGIN
  RAISE NOTICE 'V2__social_feed_schema is a no-op under the PostgreSQL baseline.';
END $$;
