-- Add multiple roles to a user
-- Replace 'your_email@example.com' with your actual email

-- First, find your user ID
SELECT id, name, email, role FROM users WHERE email = 'your_email@example.com';

-- Add both Admin and Employee roles (replace USER_ID with your actual user ID)
INSERT INTO user_roles (user_id, role, is_active) VALUES 
(1, 'Admin', TRUE),
(1, 'Employee', TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

-- Verify the roles were added
SELECT ur.user_id, u.name, u.email, ur.role, ur.is_active 
FROM user_roles ur 
JOIN users u ON ur.user_id = u.id 
WHERE u.email = 'your_email@example.com';