-- Setup user ID 9 with both Admin and Employee roles permanently
INSERT INTO user_roles (user_id, role, is_active) VALUES 
(9, 'Admin', TRUE),
(9, 'Employee', TRUE)
ON DUPLICATE KEY UPDATE is_active = TRUE;

-- Verify setup
SELECT * FROM user_roles WHERE user_id = 9;