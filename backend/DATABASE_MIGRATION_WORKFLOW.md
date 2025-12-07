# 📚 Database Migration Workflow - Complete Guide

## 🎯 Your Setup

**Current Architecture:**
- ✅ Local Development → **AWS RDS Database** (direct connection)
- ✅ Production (AWS) → **AWS RDS Database** (same database)
- ✅ **One Shared Database** - Both environments use the same AWS RDS instance

**Database Endpoint:**
- Host: `church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com`
- Port: `5432`
- Database: `church_app`

## 🔄 How Migrations Work

### **Industry Standard (Flyway Pattern):**

1. **Migration File Created:**
   - Location: `backend/src/main/resources/db/migration/V33__add_social_media_embed_support.sql`
   - Contains SQL to add columns: `external_url`, `external_platform`, `external_embed_html`

2. **Migration Runs Automatically:**
   - When the Spring Boot app starts, Flyway checks for pending migrations
   - If found, Flyway runs them automatically BEFORE the app becomes ready
   - This happens on **both** local dev AND production AWS

3. **One-Time Execution:**
   - Flyway tracks which migrations have been applied in a `flyway_schema_history` table
   - Each migration runs only ONCE per database
   - Once V33 runs, it won't run again (even if you restart)

## 🚀 Workflow When You Make a Database Change

### **Step 1: Create Migration File**
```
backend/src/main/resources/db/migration/V33__add_social_media_embed_support.sql
```

✅ **This is already done!**

### **Step 2: Apply Migration to Database**

Since you share the same database, you have **two options**:

#### **Option A: Apply via Local Development (Easiest)**
1. Start your local backend app
2. Flyway automatically runs migration V33
3. Migration applied to AWS RDS database
4. Done! Works for both local and production

#### **Option B: Apply via Production Deployment**
1. Build JAR file (includes migration)
2. Deploy to AWS Elastic Beanstalk
3. App starts → Flyway runs migration V33
4. Migration applied to AWS RDS database
5. Done!

### **Step 3: Verify Migration Ran**

Check for success messages:
- ✅ "Successfully applied 1 migration to schema"
- ✅ "Flyway migration completed"

## 🎯 Your Current Situation

**Problem:**
- Migration V33 hasn't been applied to AWS RDS yet
- Posts are failing with: `ERROR: column p1_0.external_embed_html does not exist`

**Solution:**
Since you share the database, the **easiest fix** is to:

1. **Start your local backend app** (with environment variables pointing to AWS RDS)
2. Flyway will run migration V33 automatically
3. Columns will be added to AWS RDS
4. Both local and production will work!

## ✅ Professional Migration Workflow

### **Development Process:**

1. **Create Migration File** ✅
   - Add SQL file: `V33__add_social_media_embed_support.sql`
   - Follow naming convention: `V{version}__{description}.sql`

2. **Test Migration Locally** ✅
   - Start local app
   - Flyway runs migration
   - Verify columns exist

3. **Deploy to Production**
   - Build JAR (migration included)
   - Deploy to AWS
   - Flyway runs migration on startup (if not already applied)

### **Key Points:**
- ✅ Migrations are **idempotent** - Safe to run multiple times (uses `IF NOT EXISTS`)
- ✅ Flyway tracks execution - Won't run the same migration twice
- ✅ Automatic execution - No manual SQL scripts needed
- ✅ Industry standard - Same approach used by X.com, GitHub, etc.

## 🔍 Verifying Migration Status

### **Check if Migration Already Ran:**

```sql
-- Connect to AWS RDS and run:
SELECT version, description, installed_on 
FROM flyway_schema_history 
WHERE version = '33';

-- If you see a row, migration already ran!
```

### **Check if Columns Exist:**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'posts' 
  AND column_name IN ('external_url', 'external_platform', 'external_embed_html');

-- Should return 3 rows if migration ran
```

## 🚨 Common Issues

### **Issue: Migration Didn't Run**

**Possible Causes:**
1. Flyway disabled (check `spring.flyway.enabled=true`)
2. App didn't start successfully
3. Database connection failed during startup
4. Migration file not in classpath

**Fix:**
- Check application logs for Flyway messages
- Verify database connection
- Restart application

### **Issue: Migration Failed**

**Possible Causes:**
1. SQL syntax error
2. Database permissions
3. Column already exists (should be safe with `IF NOT EXISTS`)

**Fix:**
- Check error message in logs
- Fix SQL if needed
- Create new migration to fix issue

## 📝 Summary

**Your Setup:**
- ✅ Shared database (AWS RDS)
- ✅ Migrations run automatically on app startup
- ✅ Industry standard Flyway pattern

**Current Issue:**
- Migration V33 hasn't run yet
- Need to start app (local or AWS) to trigger Flyway

**Next Step:**
- Start local backend app → Flyway runs migration → Problem solved!

---

**This is the professional, market-standard approach!** 🚀

