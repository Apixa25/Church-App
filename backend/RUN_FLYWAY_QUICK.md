# ⚡ Super Quick: Run Database Migration

**TL;DR:** Just run this one command:

```powershell
cd backend
.\mvnw.cmd flyway:migrate -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" -Ddb.user="church_user" -Ddb.password="YOUR_PASSWORD"
```

Replace `YOUR_PASSWORD` with the password from your `.env` file (line 11).

## 📍 Where to Find Your Password

Look in your project root `.env` file, line 11:
```
DB_PASSWORD=Z.jS~w]fvv[W-TyYhB8TlTD_fEG2
```

## ✅ Success Output

You'll know it worked when you see:
```
[INFO] Successfully applied 1 migration to schema "public", now at version v33
[INFO] BUILD SUCCESS
```

## 🔗 Full Guide

For more details, troubleshooting, and alternative methods, see:
- **Full Guide:** `backend/RUN_FLYWAY_MIGRATION.md`

---

**That's it!** This applies all pending migrations to your AWS RDS database.

