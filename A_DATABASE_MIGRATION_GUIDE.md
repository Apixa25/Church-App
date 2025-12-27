# Database Migration Guide for Church App

## Cloud RDS Connection Details

```
Host: church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com
Port: 5432
Database: church_app
User: church_user
Password: Z.jS~w]fvv[W-TyYhB8TlTD_fEG2
```

## How to Run Migrations

### Method 1: Using psql (Preferred)

Run SQL commands directly using psql with the password in the PGPASSWORD environment variable:

```bash
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -c "YOUR SQL HERE"
```

### Method 2: Running a Migration File

To run an entire migration file:

```bash
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -f path/to/migration.sql
```

## Important Notes

1. **Use `IF NOT EXISTS` / `IF EXISTS`**: Always use these clauses to make migrations idempotent (safe to run multiple times):
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
   - `DROP TABLE IF EXISTS`

2. **For constraints**, use a DO block to check if they exist first:
   ```sql
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'constraint_name') THEN
           ALTER TABLE table_name ADD CONSTRAINT constraint_name ...;
       END IF;
   END $$;
   ```

3. **Record in Flyway history** after running manual migrations:
   ```sql
   INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
   SELECT
       COALESCE(MAX(installed_rank), 0) + 1,
       'VERSION_NUMBER',
       'migration description',
       'SQL',
       'V##__migration_name.sql',
       NULL,
       'church_user',
       1000,
       true
   FROM flyway_schema_history
   WHERE NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = 'VERSION_NUMBER');
   ```

4. **Migration files location**: `backend/src/main/resources/db/migration/`

5. **Naming convention**: `V##__description_with_underscores.sql`

## Useful Queries

### Check existing tables
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

### Check columns in a table
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'table_name' ORDER BY ordinal_position;
```

### Check Flyway migration history
```sql
SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;
```

### Check constraints on a table
```sql
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'table_name'::regclass;
```

## Example: Running a Complete Migration

Here's the pattern for running V40 migration as an example:

```bash
# Step 1: Add columns to existing table
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -c "
ALTER TABLE worship_rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(20) DEFAULT 'LIVE';
ALTER TABLE worship_rooms ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP;
-- ... more ALTER statements
"

# Step 2: Add constraints (with existence check)
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -c "
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_worship_room_type') THEN
        ALTER TABLE worship_rooms ADD CONSTRAINT chk_worship_room_type CHECK (room_type IN ('LIVE', 'TEMPLATE', 'LIVE_EVENT'));
    END IF;
END \$\$;
"

# Step 3: Create new tables
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -c "
CREATE TABLE IF NOT EXISTS worship_playlists (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    -- ... columns
    CONSTRAINT pk_worship_playlists PRIMARY KEY (id)
);
"

# Step 4: Create indexes
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -c "
CREATE INDEX IF NOT EXISTS idx_worship_room_type ON worship_rooms(room_type);
"

# Step 5: Record in Flyway history
PGPASSWORD='Z.jS~w]fvv[W-TyYhB8TlTD_fEG2' psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -p 5432 -U church_user -d church_app -c "
INSERT INTO flyway_schema_history (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
SELECT COALESCE(MAX(installed_rank), 0) + 1, '40', 'worship room types and playlists', 'SQL', 'V40__worship_room_types_and_playlists.sql', NULL, 'church_user', 1000, true
FROM flyway_schema_history
WHERE NOT EXISTS (SELECT 1 FROM flyway_schema_history WHERE version = '40');
"
```

## Troubleshooting

### "relation already exists"
- Use `IF NOT EXISTS` in CREATE statements

### "column already exists"
- Use `ADD COLUMN IF NOT EXISTS`

### "constraint already exists"
- Wrap in a DO block with existence check (see above)

### Connection refused
- Check if RDS security group allows your IP
- Verify the host/port are correct

### Authentication failed
- Double-check username and password
- Ensure password is properly quoted (use single quotes)
