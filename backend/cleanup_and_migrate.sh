#!/bin/bash
echo "Cleaning up partial V12 migration..."
export PGPASSWORD=church_password
psql -h localhost -p 5433 -U church_user -d church_app -f cleanup_v12.sql
echo ""
echo "Cleanup completed. Now running Flyway migration..."
echo ""
./mvnw flyway:migrate
