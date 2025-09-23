-- Fix user ID 9 role in users table
UPDATE users SET role = 'Admin' WHERE id = 9;

-- Verify the change
SELECT id, name, email, role FROM users WHERE id = 9;