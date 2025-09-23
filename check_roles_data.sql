-- Check if user_roles table exists and has data
SHOW TABLES LIKE 'user_roles';

-- Check all data in user_roles table
SELECT * FROM user_roles;

-- Check specifically user ID 9
SELECT * FROM user_roles WHERE user_id = 9;

-- Check users table for user ID 9
SELECT id, name, email, role FROM users WHERE id = 9;