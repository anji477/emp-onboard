-- Create Task Categories table
CREATE TABLE IF NOT EXISTS `task_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `color` VARCHAR(7) DEFAULT '#6366f1',
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Insert default categories
INSERT INTO `task_categories` (`name`, `description`, `color`, `created_by`) VALUES
('General', 'General onboarding tasks', '#6366f1', 1),
('Paperwork', 'Document and form completion tasks', '#10b981', 1),
('IT Setup', 'Technology and system setup tasks', '#f59e0b', 1),
('Training', 'Learning and training related tasks', '#8b5cf6', 1),
('HR', 'Human resources related tasks', '#ef4444', 1),
('Compliance', 'Compliance and policy related tasks', '#06b6d4', 1);