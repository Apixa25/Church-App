# 📚 Flyway Migration - Complete Summary

## 🎯 What We Learned (December 2024)

### **The Problem:**
- Database migration V33 needed to be applied to AWS RDS
- Posts were failing with: `ERROR: column external_embed_html does not exist`
- Needed a quick way to run migrations manually

### **The Solution:**
Use Flyway Maven plugin to run migrations directly against AWS RDS database.

## ⚡ The One-Liner Command

```powershell
cd backend
.\mvnw.cmd flyway:migrate `
    -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" `
    -Ddb.user="church_user" `
    -Ddb.password="PASSWORD_FROM_ENV_FILE"
```

**Get password from:** Project root `.env` file, line 11 (`DB_PASSWORD=...`)

## 📖 Documentation Files

### **Quick Reference:**
- **`RUN_FLYWAY_QUICK.md`** - One-page cheat sheet

### **Full Guides:**
- **`RUN_FLYWAY_MIGRATION.md`** - Complete guide with all methods, troubleshooting, and details
- **`DATABASE_MIGRATION_WORKFLOW.md`** - Explains how migrations work in your architecture

### **Helper Scripts:**
- **`run-flyway.bat`** - Batch file (has password hardcoded - edit before use)
- **`run-flyway-template.bat`** - Template using environment variables
- **`run-flyway-migration.ps1`** - PowerShell script that loads .env file

## 🔑 Key Points

1. **Database Setup:** Both local dev and production use the **same AWS RDS database**
2. **Environment Variables:** Database credentials are in `.env` file in project root
3. **Migration Files:** Located in `backend/src/main/resources/db/migration/`
4. **Naming:** Must follow pattern `V{version}__{description}.sql` (two underscores!)
5. **Safe to Run:** Migrations are idempotent - Flyway prevents running same migration twice

## 🚀 Quick Actions

### Run Migration:
```powershell
cd backend
.\mvnw.cmd flyway:migrate -Ddb.url="..." -Ddb.user="..." -Ddb.password="..."
```

### Check Status:
```powershell
.\mvnw.cmd flyway:info -Ddb.url="..." -Ddb.user="..." -Ddb.password="..."
```

### Validate Files:
```powershell
.\mvnw.cmd flyway:validate -Ddb.url="..." -Ddb.user="..." -Ddb.password="..."
```

## 💡 Next Time You Need This

1. Open `RUN_FLYWAY_QUICK.md`
2. Copy the command
3. Get password from `.env` file
4. Run it!

**That's it!** No need to figure it out again. 🎉

---

**Created:** After solving V33 migration issue  
**Purpose:** Quick reference for future database migrations

