-- ===================================================
-- SQL Scripts for User Role Management
-- ===================================================
-- Run these in your H2 database console: http://localhost:8083/api/h2-console
-- JDBC URL: jdbc:h2:file:./data/church_app
-- Username: sa
-- Password: password
-- ===================================================

-- 1. Update Steven Sills II to ADMIN role
UPDATE users 
SET role = 'ADMIN' 
WHERE name = 'Steven Sills II';

-- 2. Set password for admin@church.local (BCrypt hash for "admin123")
-- Note: This is a BCrypt hash - you'll need to generate a new one if changing password
-- The DataInitializer now sets this automatically, but you can update it manually here
-- UPDATE users 
-- SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
-- WHERE email = 'admin@church.local' AND (password_hash IS NULL OR password_hash = '');

-- ===================================================
-- Verification Queries
-- ===================================================

-- Verify Steven Sills II is now ADMIN
SELECT id, name, email, role, is_active 
FROM users 
WHERE name = 'Steven Sills II';

-- See all admin users
SELECT id, name, email, role, is_active, password_hash IS NOT NULL as has_password
FROM users 
WHERE role = 'ADMIN'
ORDER BY name;

-- See all users and their roles
SELECT id, name, email, role, is_active 
FROM users 
ORDER BY role, name;

