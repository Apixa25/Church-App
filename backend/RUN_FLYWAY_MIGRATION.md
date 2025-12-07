# 🚀 Quick Guide: Run Flyway Migration Against AWS RDS

This guide shows you the **fastest way** to apply database migrations to your AWS RDS database.

> **📖 For the absolute fastest reference, see:** `RUN_FLYWAY_QUICK.md`

## ⚡ Quick Start (30 seconds)

### **Method 1: Manual Command (Recommended)**

**Copy-paste this command (replace password from `.env` file):**

```powershell
cd backend
.\mvnw.cmd flyway:migrate `
    -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" `
    -Ddb.user="church_user" `
    -Ddb.password="YOUR_PASSWORD_FROM_ENV"
```

**Where to find your password:** Look in your project root `.env` file, line 11 (`DB_PASSWORD=...`)

### **Method 2: Use the Batch File**

**Option A:** Edit `run-flyway.bat` and add your password, then run:
```powershell
cd backend
.\run-flyway.bat
```

**Option B:** Load environment variables first, then use template:
```powershell
cd ..
. .\load-env.ps1
cd backend
# Edit run-flyway-template.bat to use %DB_PASSWORD% variable
.\run-flyway-template.bat
```

### **Why Manual Command is Recommended:**
- ✅ No file editing needed
- ✅ Password stays in `.env` file (not hardcoded)
- ✅ Works immediately with copy-paste
- ✅ Clear and explicit

## 📋 Prerequisites

### 1. **`.env` File in Project Root**

Your `.env` file should contain:

```env
# Database Configuration (lines 5-11)
DB_URL=jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app
DB_HOST=church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=church_app
DB_USER=church_user
DB_PASSWORD=your_actual_password_here
```

**Note:** The `.env` file is in your project root (not in `backend/` folder).

### 2. **Migration File Exists**

Migration files should be in:
```
backend/src/main/resources/db/migration/V{version}__{description}.sql
```

Example: `V33__add_social_media_embed_support.sql`

## ✅ What Success Looks Like

When the migration runs successfully, you'll see:

```
[INFO] Database: jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app (PostgreSQL 15.15)
[INFO] Successfully validated 33 migrations (execution time 00:00.242s)
[INFO] Current version of schema "public": 32
[INFO] Migrating schema "public" to version "33 - add social media embed support"
[INFO] Successfully applied 1 migration to schema "public", now at version v33
[INFO] BUILD SUCCESS
```

## 🔍 Verify Migration Status

### Check Migration History

You can verify which migrations have run by checking the Flyway schema history table:

```sql
SELECT version, description, installed_on, success
FROM flyway_schema_history
ORDER BY installed_rank DESC
LIMIT 5;
```

### Check Specific Migration

```sql
SELECT version, description, installed_on
FROM flyway_schema_history
WHERE version = '33';
```

If you see a row, the migration ran successfully! ✅

## 🛠️ Troubleshooting

### **Issue: "Could not connect to database"**

**Fix:**
1. Check that your `.env` file exists in the project root
2. Verify database credentials are correct
3. Ensure AWS RDS database is running and accessible
4. Check your network connection

### **Issue: "Migration already applied"**

This is **normal** and **safe**! Flyway tracks which migrations have run and won't run them twice. If you see:

```
[INFO] Current version of schema "public": 33
[INFO] Schema "public" is up to date. No migration necessary.
```

This means all migrations are already applied. ✅

### **Issue: "No migrations found"**

**Fix:**
1. Check that migration files are in: `backend/src/main/resources/db/migration/`
2. Verify file naming: `V{number}__{description}.sql` (two underscores!)
3. Ensure file has `.sql` extension

### **Issue: Batch file doesn't work**

**Fallback:** Use Method 2 (manual command) above, or use the PowerShell script:

```powershell
cd backend
.\run-flyway-migration.ps1
```

## 📚 How It Works

### **Your Database Setup:**
- **Local Development** → Connects to **AWS RDS** (same database)
- **Production (AWS)** → Connects to **AWS RDS** (same database)
- **One Shared Database** - Both environments use the same AWS RDS instance

### **Migration Process:**
1. Flyway connects to AWS RDS using credentials from `.env`
2. Checks `flyway_schema_history` table to see which migrations have run
3. Runs any new migrations that haven't been applied yet
4. Updates the history table to track what ran
5. Each migration runs **only once** (idempotent)

### **Why This Works:**
- ✅ Migrations are stored in the JAR file (included in build)
- ✅ Flyway automatically runs on app startup
- ✅ But you can also run them manually using Maven plugin
- ✅ Safe to run multiple times (Flyway prevents duplicates)

## 🎯 When to Run Migrations

### **Automatically (Recommended):**
- When you deploy a new JAR to AWS Elastic Beanstalk
- When you start your local Spring Boot app
- Flyway runs migrations automatically on startup

### **Manually (When Needed):**
- To apply a migration without restarting the app
- To test a migration before deploying
- To fix a database schema issue quickly
- **This is what this guide is for!**

## 📝 Quick Reference Commands

```powershell
# Run all pending migrations
cd backend
.\run-flyway.bat

# Check migration status (info only, doesn't run migrations)
.\mvnw.cmd flyway:info -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" -Ddb.user="church_user" -Ddb.password="YOUR_PASSWORD"

# Validate migrations (checks files are valid, doesn't run them)
.\mvnw.cmd flyway:validate -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" -Ddb.user="church_user" -Ddb.password="YOUR_PASSWORD"
```

## 🚨 Important Notes

1. **Database Credentials:** Never commit your `.env` file to git (it's in `.gitignore`)
2. **Idempotent Migrations:** Always use `IF NOT EXISTS` in your SQL to make migrations safe to run multiple times
3. **Naming Convention:** Migration files must follow: `V{version}__{description}.sql` (two underscores!)
4. **Version Numbers:** Use sequential version numbers (V33, V34, V35, etc.)

## 📖 Related Documentation

- **Full Workflow Guide:** `backend/DATABASE_MIGRATION_WORKFLOW.md`
- **Check Migration Status:** `backend/CHECK_MIGRATION_STATUS.md`
- **Deploy Migration Guide:** `backend/DEPLOY_V33_MIGRATION.md`

---

**Created:** December 2024  
**Last Updated:** After solving V33 migration issue  
**Purpose:** Quick reference for running Flyway migrations manually

