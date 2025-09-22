-- Add assignment tables to existing schema

-- User Assignments table - tracks what's assigned to each user
CREATE TABLE `user_assignments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `item_type` ENUM('task', 'policy', 'document', 'training') NOT NULL,
  `item_id` INT NOT NULL,
  `assigned_by` INT NOT NULL,
  `assigned_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `due_date` DATE,
  `is_required` BOOLEAN DEFAULT TRUE,
  `is_common` BOOLEAN DEFAULT FALSE,
  `status` ENUM('assigned', 'in_progress', 'completed', 'overdue') DEFAULT 'assigned',
  `completed_date` TIMESTAMP NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX (`user_id`, `item_type`),
  INDEX (`is_common`)
);

-- Update tasks table to add assignment info
ALTER TABLE `tasks` ADD COLUMN `assigned_by` INT NULL;
ALTER TABLE `tasks` ADD COLUMN `is_common` BOOLEAN DEFAULT FALSE;
ALTER TABLE `tasks` ADD FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Update policies table to add assignment info  
ALTER TABLE `policies` ADD COLUMN `is_common` BOOLEAN DEFAULT TRUE;
ALTER TABLE `policies` ADD COLUMN `is_required` BOOLEAN DEFAULT FALSE;

-- Update training_modules table to add assignment info
ALTER TABLE `training_modules` ADD COLUMN `is_common` BOOLEAN DEFAULT TRUE;
ALTER TABLE `training_modules` ADD COLUMN `is_required` BOOLEAN DEFAULT FALSE;

-- Update user_documents table to add assignment info
ALTER TABLE `user_documents` ADD COLUMN `is_common` BOOLEAN DEFAULT FALSE;
ALTER TABLE `user_documents` ADD COLUMN `assigned_by` INT NULL;
ALTER TABLE `user_documents` ADD FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Insert common items (visible to all employees)
INSERT INTO `user_assignments` (`user_id`, `item_type`, `item_id`, `assigned_by`, `is_common`, `is_required`) 
SELECT u.id, 'policy', p.id, 1, TRUE, TRUE
FROM `users` u, `policies` p 
WHERE p.category IN ('HR', 'IT') AND u.role = 'Employee';

INSERT INTO `user_assignments` (`user_id`, `item_type`, `item_id`, `assigned_by`, `is_common`, `is_required`) 
SELECT u.id, 'training', t.id, 1, TRUE, TRUE
FROM `users` u, `training_modules` t 
WHERE t.title IN ('Welcome to Company', 'Security Training') AND u.role = 'Employee';

-- Update existing data
UPDATE `policies` SET `is_common` = TRUE, `is_required` = TRUE WHERE `category` IN ('HR', 'IT');
UPDATE `training_modules` SET `is_common` = TRUE, `is_required` = TRUE WHERE `title` IN ('Welcome to Company', 'Security Training');
UPDATE `tasks` SET `is_common` = TRUE WHERE `category` = 'General';