---
name: start-church-app-dev
description: Start The Gathering / Church App local development servers for this project. Use when the user asks to start, restart, run, boot, or verify the local dev server, frontend, backend, localhost:3000, localhost:8083, or The Gathering dev environment.
---

# Start Church App Dev Servers

## Scope

This skill is project-local to The Gathering / Church App repository. Do not use it for other projects such as ProjectXBidX, because their dev server startup sequence is different.

## Expected Local Services

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8083/api`
- Backend health check: `http://localhost:8083/api/actuator/health`

## Backend Startup

Always start the backend from the `backend` directory so `load-env.ps1` can find `.env.local` or `.env`.

```powershell
cd C:\Users\Admin\Church-App\Church-App\backend
. .\load-env.ps1
.\mvnw.cmd spring-boot:run
```

Important details:

- The leading dot in `. .\load-env.ps1` is required. It dot-sources the script so environment variables remain available in the same PowerShell session.
- `load-env.ps1` checks `.env.local` first, then `.env`.
- If port `8083` is already in use, ask the user before killing the process unless the user already gave explicit permission.

## Frontend Startup

Start the frontend from the `frontend` directory.

```powershell
cd C:\Users\Admin\Church-App\Church-App\frontend
npm start
```

Important details:

- React should open or serve at `http://localhost:3000`.
- If port `3000` is already in use, check what is running there before stopping anything.
- If another project is using port `3000`, ask the user before killing that process unless the user already gave explicit permission.

## Verification

After startup:

1. Confirm the frontend compiled successfully.
2. Confirm backend health:

```powershell
Invoke-WebRequest -Uri "http://localhost:8083/api/actuator/health" -UseBasicParsing
```

1. If Google OAuth fails locally, verify the backend is running and that `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` are loaded by `load-env.ps1`.

## Common Mistake

If the user runs this from the repo root:

```powershell
. .\load-env.ps1
```

PowerShell will fail because `load-env.ps1` lives in `backend`. Tell them to run:

```powershell
cd backend
. .\load-env.ps1
.\mvnw.cmd spring-boot:run
```
