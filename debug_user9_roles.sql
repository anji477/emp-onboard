-- Debug and fix user ID 9 roles issue

-- 1. Check current state of user ID 9
SELECT 'Current user data:' as info;
SELECT id, name, email, role FROM users WHERE id = 9;

SELECT 'Current user_roles data:' as info;
SELECT * FROM user_roles WHERE user_id = 9;

-- 2. Clean up any existing roles for user 9
DELETE FROM user_roles WHERE user_id = 9;

-- 3. Insert both Employee and Admin roles for user 9
INSERT INTO user_roles (user_id, role, is_active) VALUES 
(9, 'Employee', TRUE),
(9, 'Admin', TRUE);

-- 4. Set Employee as the primary role in users table
UPDATE users SET role = 'Employee' WHERE id = 9;

-- 5. Verify the setup
SELECT 'After setup - user data:' as info;
SELECT id, name, email, role FROM users WHERE id = 9;

SELECT 'After setup - user_roles data:' as info;
SELECT * FROM user_roles WHERE user_id = 9 ORDER BY created_at;

-- 6. Test the switch role query that server uses
SELECT 'Testing switch to Admin role:' as info;
SELECT role FROM user_roles WHERE user_id = 9 AND role = 'Admin' AND is_active = TRUE;

SELECT 'Testing switch to Employee role:' as info;
SELECT role FROM user_roles WHERE user_id = 9 AND role = 'Employee' AND is_active = TRUE;