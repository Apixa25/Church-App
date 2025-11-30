# 🗄️ Create church_app Database

The migrations tried to run but the `church_app` database doesn't exist yet. We need to create it first.

---

## ✅ Option 1: Using AWS RDS Query Editor (Easiest)

1. **Go to AWS Console:** https://console.aws.amazon.com/
2. **Navigate to:** RDS → Query Editor
3. **Connect to database:**
   - **Database:** Select `postgres` (default database)
   - **Username:** `church_user`
   - **Password:** Your database password
   - **Connect**
4. **Run this SQL:**
   ```sql
   CREATE DATABASE church_app;
   ```
5. **Click "Run"**
6. **Wait for confirmation** (should say "Query executed successfully")

---

## ✅ Option 2: Using psql (If Installed)

If you have PostgreSQL client tools installed:

```powershell
psql -h church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com -U church_user -d postgres

# Then in psql:
CREATE DATABASE church_app;
\q
```

---

## ✅ Option 3: Fix Migration V13 Issue

The migration V13 is trying to create a "General Discussion" group but expects an ADMIN user to exist. Since this is a fresh database, we need to either:

1. **Skip V13 for now** (if it's only for data migration)
2. **Modify V13** to handle the case where no users exist
3. **Create a default admin user first**

---

## 🎯 After Creating Database

Once `church_app` database is created, run migrations again:

```powershell
cd backend
.\run-migrations-simple.ps1
```

**Note:** You may need to fix or skip migration V13 if it still fails due to no users existing.

---

## 🔧 Quick Fix for V13

If V13 fails because there are no users, we can:

1. **Temporarily skip it** (if it's only for migrating existing data)
2. **Modify it** to create a default admin user first
3. **Run it later** after creating the first user

Let me know which approach you prefer!

