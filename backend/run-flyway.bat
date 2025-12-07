@echo off
echo ========================================
echo   Running Flyway Migration V33
echo ========================================
echo.

cd /d %~dp0

echo Loading database credentials from .env file...
echo.

call mvnw.cmd flyway:migrate ^
    -Ddb.url="jdbc:postgresql://church-app-db.cj88a8mwiwbt.us-west-2.rds.amazonaws.com:5432/church_app" ^
    -Ddb.user="church_user" ^
    -Ddb.password="Z.jS~w]fvv[W-TyYhB8TlTD_fEG2"

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
