# Database Setup & Migration Guide

Welcome to the Church App database workflow! 🎯 This document explains how we run PostgreSQL locally, manage schema changes with Flyway, and keep every environment in sync with the vision outlined in `project-vision.md`.

## 1. Why PostgreSQL + Flyway?

- 📚 **Vision alignment** – `project-vision.md` commits the project to a secure, scalable PostgreSQL stack. Running the same database locally, in CI, and in production keeps behaviour consistent and prevents “works on my machine” bugs.
- 🧱 **Flyway** – Tracks every schema change as a versioned migration. It guarantees that teammates, CI, and production all share the same structure and provides a safe audit trail.

## 2. Start PostgreSQL with Docker

```bash
cd backend
docker compose up -d
```

This launches a PostgreSQL 15 container with the following defaults (the application uses the same values if environment variables aren’t provided):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5433` | Database port |
| `DB_NAME` | `church_app` | Database name |
| `DB_USER` | `church_user` | Username |
| `DB_PASSWORD` | `church_password` | Password |

> 💡 If you prefer a manual installation, create the same database/user and export the variables above in your shell.

## 3. Run Migrations End-to-End

Every time you pull new backend code:

```bash
cd backend
./mvnw flyway:migrate
```

- Flyway reads migrations from `src/main/resources/db/migration`.
- Baseline version is `1`, so existing V2…V8 scripts apply cleanly to new databases.
- The Maven wrapper (`mvnw`) ensures the correct Maven version without extra installs.

## 4. Boot the Backend

```bash
cd backend
./mvnw spring-boot:run
```

The API listens at `http://localhost:8083/api`. Flyway executes automatically during startup; the manual command above makes sure failures surface early.

## 5. Common Commands

```bash
# Re-run a clean PostgreSQL instance
docker compose down -v
docker compose up -d

# Inspect the Flyway history table
psql -h localhost -U church_user -d church_app -c "SELECT * FROM flyway_schema_history;"

# Apply migrations in CI/CD
./mvnw flyway:clean flyway:migrate  # example for disposable databases
```

## 6. Adding a New Migration

1. Create a new file in `backend/src/main/resources/db/migration` using the naming convention `V9__your_description.sql`.
2. Write PostgreSQL-compliant SQL (arrays, UUID defaults, etc. are welcome!).
3. Run `./mvnw flyway:migrate` locally to verify the script.
4. Commit both the migration and any related Java changes together.

## 7. Troubleshooting

- 🐘 **Docker not running** – Start Docker Desktop before running `docker compose`.
- ⚠️ **Migration failure** – Flyway stops at the first error. Fix the SQL, then run `./mvnw flyway:repair` followed by `./mvnw flyway:migrate`.
- 🔑 **Credential override** – Export `DB_*` variables or edit `application.properties` if you use different connection details.

## 8. Future-Proofing

Following this workflow ensures a smooth path to the project’s long-term goal: supporting thousands of users confidently. It also keeps onboarding fast—new teammates just need Docker, Java, and this guide to be productive. 🙌

