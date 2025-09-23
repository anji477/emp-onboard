-- Create user_roles table for multiple role support
CREATE TABLE `user_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `role` ENUM('Employee', 'Manager', 'HR', 'Admin', 'IT') NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_role` (`user_id`, `role`)
);

-- Insert default roles for existing users based on their current role
INSERT INTO `user_roles` (`user_id`, `role`) 
SELECT `id`, `role` FROM `users`;

-- Add example multi-role users
-- Make Admin User have both Admin and Employee access
INSERT INTO `user_roles` (`user_id`, `role`) VALUES (1, 'Employee');

-- Make HR Manager have both HR and Employee access  
INSERT INTO `user_roles` (`user_id`, `role`) VALUES (8, 'Employee');

-- Example: Give Alex Doe both Employee and Admin access (for testing)
INSERT INTO `user_roles` (`user_id`, `role`) VALUES (6, 'Admin');