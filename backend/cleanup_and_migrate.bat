@echo off
echo Cleaning up partial V12 migration...
set PGPASSWORD=postgres
psql -h localhost -p 5433 -U postgres -d church_app -f cleanup_v12.sql
echo.
echo Cleanup completed. Now running Flyway migration...
echo.
call mvnw.cmd flyway:migrate
