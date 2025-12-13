@echo off
REM ========================================
REM   Flyway Migration Runner
REM ========================================
REM   This script runs Flyway migrations against AWS RDS
REM   Make sure your .env file has the correct DB_PASSWORD set
REM ========================================

echo ========================================
echo   Running Flyway Migration
echo ========================================
echo.

cd /d %~dp0

REM Get password from environment variable (set by load-env.ps1 or manually)
if "%DB_PASSWORD%"=="" (
    echo ERROR: DB_PASSWORD environment variable not set!
    echo.
    echo Please either:
    echo   1. Load .env file: cd .. && . .\load-env.ps1 && cd backend
    echo   2. Set manually: set DB_PASSWORD=your_password
    echo.
    pause
    exit /b 1
)

echo Connecting to AWS RDS database...
echo.

call mvnw.cmd flyway:migrate ^
    -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" ^
    -Ddb.user="church_user" ^
    -Ddb.password="%DB_PASSWORD%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Migration Completed Successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Migration Failed!
    echo ========================================
)

pause

