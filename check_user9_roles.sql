-- Check current roles for user ID 9
SELECT * FROM user_roles WHERE user_id = 9;

-- Ensure user ID 9 has both Employee and Admin roles
INSERT INTO user_roles (user_id, role) VALUES (9, 'Employee') 
ON DUPLICATE KEY UPDATE is_active = TRUE;

INSERT INTO user_roles (user_id, role) VALUES (9, 'Admin') 
ON DUPLICATE KEY UPDATE is_active = TRUE;

-- Update users table to set primary role as Employee (current role)
UPDATE users SET role = 'Employee' WHERE id = 9;

-- Verify the roles after insert
SELECT * FROM user_roles WHERE user_id = 9;
SELECT id, name, role FROM users WHERE id = 9;