# Database Cleanup Instructions

## Purpose
This cleanup removes all test data while preserving the multi-tenant infrastructure, giving you a fresh start for testing.

## What Gets Deleted
- ✅ All 5 user accounts
- ✅ All posts, comments, likes, shares
- ✅ All prayer requests and interactions
- ✅ All events and RSVPs
- ✅ All announcements
- ✅ All chat messages and groups
- ✅ All donations and subscriptions
- ✅ All worship room data
- ✅ All audit logs
- ✅ All user relationships and settings

## What Gets Preserved
- 🔒 Database schema (all tables, constraints, indexes)
- 🔒 Global organization ("The Gathering Community")
- 🔒 General Discussion group
- 🔒 Migration tracker organization
- 🔒 Flyway migration history

## Running the Cleanup

### Option 1: Automated Script (Recommended)

```bash
cd backend
chmod +x cleanup_and_verify.sh
./cleanup_and_verify.sh
```

This will:
1. Create an automatic backup
2. Run the cleanup
3. Verify critical data is preserved
4. Show you the results

### Option 2: Manual Execution

```bash
cd backend
export PGPASSWORD=church_password
psql -h localhost -p 5433 -U church_user -d church_app -f cleanup_test_data.sql
```

## After Cleanup

Your database will be in a clean state:
- **0 users** - Ready to register fresh test accounts
- **0 posts** - Ready to test posting with proper organization assignment
- **0 prayers** - Ready to test prayer requests within organizations
- **0 events** - Ready to test event creation with organization scoping
- **1 organization** - The Global organization (ready for users to join)
- **1 group** - General Discussion group (ready for new members)

## Creating Test Data

After cleanup, you can:

1. **Register new test users:**
   - Go to `/register`
   - Create 2-3 test accounts with different roles

2. **All new users will automatically:**
   - Be assigned to the Global organization as primary
   - Join the General Discussion group
   - Have proper multi-tenant relationships

3. **Test multi-tenant features:**
   - Create posts (they'll be assigned to Global org)
   - Create prayers (they'll be org-specific)
   - Create events (they'll be org-specific)
   - Test organization switching (after creating new orgs)
   - Test group muting
   - Test feed filtering

## Backup & Restore

### Automatic Backup
The `cleanup_and_verify.sh` script creates automatic backups in `backend/backups/`

### Manual Backup (Before Cleanup)
```bash
export PGPASSWORD=church_password
pg_dump -h localhost -p 5433 -U church_user -d church_app > backup_$(date +%Y%m%d).sql
```

### Restore from Backup
```bash
export PGPASSWORD=church_password
psql -h localhost -p 5433 -U church_user -d church_app < backup_20250114.sql
```

## Verification Queries

After cleanup, you can verify the results:

### Check user count (should be 0)
```sql
SELECT COUNT(*) FROM users;
```

### Check Global organization exists (should be 1)
```sql
SELECT * FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
```

### Check General Discussion group exists (should be 1)
```sql
SELECT * FROM groups
WHERE created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND name = 'General Discussion';
```

### Check all content is deleted
```sql
SELECT
    'Posts' as table_name, COUNT(*) as count FROM posts
UNION ALL
SELECT 'Prayers', COUNT(*) FROM prayer_requests
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'Donations', COUNT(*) FROM donations;
```

## Troubleshooting

### If cleanup fails:
1. Check the error message
2. Restore from the automatic backup
3. Review the cleanup SQL script for issues
4. Contact support if foreign key constraints are blocking deletion

### If Global org is missing after cleanup:
The V13 migration should recreate it. Run:
```bash
./mvnw flyway:repair
./mvnw flyway:migrate
```

## Safety Features

✅ **Automatic backup** before deletion
✅ **Idempotent** - Can be run multiple times safely
✅ **Preserves schema** - No need to re-run migrations
✅ **Verification step** - Confirms critical data preserved
✅ **Detailed logging** - Shows exactly what was deleted

## Next Steps After Cleanup

1. **Backend**: Already running, no restart needed
2. **Frontend**: Refresh the browser
3. **Register**: Create fresh test accounts
4. **Test**: All multi-tenant features with clean data!

---

**Ready for a fresh start!** 🎉
