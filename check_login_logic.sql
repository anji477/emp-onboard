-- Check what's happening with user ID 9 login
SELECT 'Users table data:' as info;
SELECT id, name, email, role FROM users WHERE id = 9;

SELECT 'User_roles table data:' as info;
SELECT * FROM user_roles WHERE user_id = 9;

-- Check if user_roles table exists and has data
SELECT 'All user_roles data:' as info;
SELECT * FROM user_roles LIMIT 5;