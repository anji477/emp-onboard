-- Add Admin role to user ID 9 (Sarah Johnson) for testing
INSERT INTO `user_roles` (`user_id`, `role`) VALUES (9, 'Admin') 
ON DUPLICATE KEY UPDATE `is_active` = TRUE;