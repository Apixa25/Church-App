#!/bin/bash

# ============================================================================
# Cleanup Test Data and Verify
# ============================================================================
# This script:
# 1. Creates a backup of the current database
# 2. Runs the cleanup SQL script
# 3. Verifies the Global org and General Discussion group still exist
# ============================================================================

set -e  # Exit on any error

echo "============================================================================"
echo "CHURCH APP - DATABASE CLEANUP UTILITY"
echo "============================================================================"
echo ""

# Database connection settings
export PGPASSWORD=church_password
DB_HOST=localhost
DB_PORT=5433
DB_USER=church_user
DB_NAME=church_app

# Backup directory
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/church_app_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Step 1: Creating database backup..."
echo "----------------------------------------"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
else
    echo "❌ Backup failed! Aborting cleanup."
    exit 1
fi

echo ""
echo "Step 2: Running cleanup script..."
echo "----------------------------------------"

# Run cleanup script
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f cleanup_test_data.sql

if [ $? -eq 0 ]; then
    echo "✅ Cleanup completed successfully"
else
    echo "❌ Cleanup failed!"
    echo "You can restore from backup: $BACKUP_FILE"
    exit 1
fi

echo ""
echo "Step 3: Final verification..."
echo "----------------------------------------"

# Verify Global org exists
GLOBAL_ORG_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;")

if [ "$GLOBAL_ORG_COUNT" -eq 1 ]; then
    echo "✅ Global organization preserved"
else
    echo "❌ WARNING: Global organization missing!"
fi

# Verify General Discussion group exists
GENERAL_GROUP_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM groups WHERE created_by_org_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'General Discussion';")

if [ "$GENERAL_GROUP_COUNT" -eq 1 ]; then
    echo "✅ General Discussion group preserved"
else
    echo "❌ WARNING: General Discussion group missing!"
fi

echo ""
echo "============================================================================"
echo "CLEANUP COMPLETE!"
echo "============================================================================"
echo "Database is ready for fresh testing."
echo ""
echo "Backup location: $BACKUP_FILE"
echo ""
echo "To restore from backup if needed:"
echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
echo "============================================================================"
