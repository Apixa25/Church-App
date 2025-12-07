# 🔍 Check Migration V33 Status on AWS

## The Problem

Posts are returning 500 errors because the migration V33 hasn't been applied to the AWS production database. The error is:

```
ERROR: column p1_0.external_embed_html does not exist
```

## ✅ Step 1: Check AWS Backend Logs

### **Option A: Elastic Beanstalk Console (Easiest)**

1. Go to: https://console.aws.amazon.com/elasticbeanstalk
2. Select your environment (e.g., `church-app-api-prod`)
3. Click **"Logs"** tab (left sidebar)
4. Click **"Request Logs"** → **"Last 1000 lines"**
5. Download the logs

### **Option B: CloudWatch Logs**

1. Go to: https://console.aws.amazon.com/cloudwatch
2. Click **"Log groups"** (left sidebar)
3. Find your environment log group (e.g., `/aws/elasticbeanstalk/church-app-api-prod/var/log/eb-engine.log`)
4. View recent log stream

## 🔍 What to Look For

### **Search for "Flyway" in the logs:**

Look for these messages:

✅ **Good - Migration Ran:**
```
Flyway Community Edition X.X.X by Redgate
Successfully validated X migrations (execution time XXms)
Successfully applied 1 migration to schema "public" (execution time XXms)
```

❌ **Bad - Migration Failed:**
```
Flyway migration failed
ERROR: ...
```

❌ **Worse - Flyway Didn't Run:**
- No "Flyway" messages at all
- No migration execution logs

### **Search for "V33":**

Look for:
```
V33__add_social_media_embed_support
```

### **Check Application Startup:**

Look for:
```
Started ChurchAppApplication in X seconds
```

## 🚨 Common Issues

### **Issue 1: Migration Didn't Run**

**Symptoms:**
- No Flyway logs at startup
- App starts but columns don't exist

**Possible Causes:**
- Flyway disabled in production config
- Database connection issue during startup
- Migration file not in JAR

**Fix:**
- Verify `spring.flyway.enabled=true` in application.properties
- Check database connection logs
- Verify migration file is in deployed JAR

### **Issue 2: Migration Failed**

**Symptoms:**
- Flyway logs show error
- Migration attempted but failed

**Possible Causes:**
- SQL syntax error
- Database permissions issue
- Column already exists (if migration was partially applied)

**Fix:**
- Check error message in logs
- Verify database user has ALTER TABLE permissions
- Check if columns partially exist

### **Issue 3: JAR File Doesn't Include Migration**

**Symptoms:**
- Migration file not found in JAR
- Flyway shows "0 migrations found"

**Fix:**
- Rebuild JAR file
- Verify migration file is in `src/main/resources/db/migration/`
- Check JAR contents: `jar tf target/church-app-backend-0.0.1-SNAPSHOT.jar | grep V33`

## ✅ Step 2: Verify Migration File is in JAR

If you still have the JAR file locally, verify it includes the migration:

```powershell
# Check if migration is in JAR
jar tf target\church-app-backend-0.0.1-SNAPSHOT.jar | Select-String "V33"
```

**Expected output:**
```
BOOT-INF/classes/db/migration/V33__add_social_media_embed_support.sql
```

## ✅ Step 3: Check Flyway Configuration

Verify Flyway is enabled and configured correctly:

1. Check `backend/src/main/resources/application.properties`:
   ```properties
   spring.flyway.enabled=true
   spring.flyway.locations=classpath:db/migration
   ```

2. Verify these settings are in the production JAR

## 🔧 Next Steps Based on Findings

### **If Migration Didn't Run:**

1. Check why Flyway didn't execute
2. Verify database connection during startup
3. Check if Flyway is disabled in production config
4. Redeploy if needed

### **If Migration Failed:**

1. Read the error message from logs
2. Fix the issue (SQL error, permissions, etc.)
3. Create a new migration to fix it
4. Redeploy

### **If Everything Looks Good but Columns Don't Exist:**

1. Migration might have run but failed silently
2. Check database connection during migration
3. Verify database user has necessary permissions
4. Consider applying migration manually if possible

---

**After checking logs, share what you find and we'll fix it!** 🔍

