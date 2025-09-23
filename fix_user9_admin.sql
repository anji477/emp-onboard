-- Add Admin role to user ID 9
INSERT INTO user_roles (user_id, role, is_active) VALUES (9, 'Admin', TRUE) 
ON DUPLICATE KEY UPDATE is_active = TRUE;

-- Verify user 9 now has both roles
SELECT * FROM user_roles WHERE user_id = 9;