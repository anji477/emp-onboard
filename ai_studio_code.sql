-- Employee Onboarding Portal Database Schema
-- Clean working version

-- Drop tables in reverse order
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `user_documents`;
DROP TABLE IF EXISTS `company_documents`;
DROP TABLE IF EXISTS `user_training_progress`;
DROP TABLE IF EXISTS `training_modules`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `it_assets`;
DROP TABLE IF EXISTS `policies`;
DROP TABLE IF EXISTS `users`;

-- Create Users table
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Employee', 'Admin', 'HR') NOT NULL DEFAULT 'Employee',
  `avatar_url` VARCHAR(255),
  `team` VARCHAR(100),
  `job_title` VARCHAR(100),
  `start_date` DATE,
  `onboarding_progress` INT DEFAULT 0,
  `manager_id` INT,
  `buddy_id` INT,
  FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`buddy_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Create Policies table
CREATE TABLE `policies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `summary` TEXT,
  `content` LONGTEXT
);

-- Create IT Assets table
CREATE TABLE `it_assets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `type` ENUM('Hardware', 'Software') NOT NULL,
  `serial_number` VARCHAR(255) UNIQUE,
  `status` ENUM('Assigned', 'Unassigned', 'PendingReturn', 'Returned') NOT NULL,
  `purchase_date` DATE,
  `warranty_info` VARCHAR(255),
  `license_expiry` DATE,
  `location` VARCHAR(100),
  `assigned_to_id` INT,
  `assigned_date` DATE,
  FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- Create Tasks table
CREATE TABLE `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `due_date` DATE,
  `status` ENUM('ToDo', 'InProgress', 'Completed') NOT NULL DEFAULT 'ToDo',
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Create Training Modules table
CREATE TABLE `training_modules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `type` ENUM('Video', 'PDF', 'Quiz') NOT NULL,
  `duration` VARCHAR(50),
  `thumbnail_url` VARCHAR(255)
);

-- Create User Training Progress table
CREATE TABLE `user_training_progress` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `module_id` INT NOT NULL,
  `completed` BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`module_id`) REFERENCES `training_modules`(`id`) ON DELETE CASCADE,
  UNIQUE(`user_id`, `module_id`)
);

-- Create Company Documents table
CREATE TABLE `company_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `url` VARCHAR(255) NOT NULL
);

-- Create User Documents table
CREATE TABLE `user_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `status` ENUM('Pending', 'Uploaded', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
  `action_date` DATE,
  `rejection_reason` TEXT,
  `file_url` VARCHAR(255),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Create Notifications table
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Insert Users
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar_url`, `team`, `job_title`, `start_date`, `onboarding_progress`) VALUES
(1, 'Admin User', 'admin@example.com', 'password123', 'Admin', 'https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff', 'Management', 'Administrator', '2022-01-01', 100),
(6, 'Alex Doe', 'alex.doe@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Alex+Doe&background=6366f1&color=fff', 'Engineering', 'Developer', '2024-01-01', 25),
(7, 'Jane Smith', 'jane.smith@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Jane+Smith&background=6366f1&color=fff', 'Engineering', 'Senior Developer', '2023-01-01', 100),
(8, 'HR Manager', 'hr@example.com', 'password123', 'HR', 'https://ui-avatars.com/api/?name=HR+Manager&background=6366f1&color=fff', 'Human Resources', 'HR Manager', '2022-01-01', 100);

-- Insert Policies
INSERT INTO `policies` (`title`, `category`, `summary`, `content`) VALUES
('Code of Conduct', 'HR', 'Company conduct guidelines', 'All employees must maintain professional behavior and treat colleagues with respect.'),
('Work From Home Policy', 'Operations', 'Remote work guidelines', 'Employees may work remotely up to 2 days per week with manager approval.'),
('IT Security Policy', 'IT', 'Security requirements', 'All employees must use strong passwords and enable two-factor authentication.'),
('Expense Reimbursement', 'Finance', 'Expense policy', 'Submit expenses within 30 days with proper receipts and documentation.');

-- Insert IT Assets
INSERT INTO `it_assets` (`name`, `type`, `serial_number`, `status`, `purchase_date`, `warranty_info`, `assigned_to_id`, `assigned_date`) VALUES
('MacBook Pro 16', 'Hardware', 'C02F1234ABCD', 'Assigned', '2023-08-15', 'AppleCare+ until 2026-08-15', 6, '2024-01-01'),
('Dell Latitude 7420', 'Hardware', 'DL7420-5678', 'Unassigned', '2023-03-10', 'Dell ProSupport until 2026-03-10', NULL, NULL),
('iPhone 15', 'Hardware', 'IP15-001', 'Unassigned', '2024-01-15', 'Apple Warranty until 2026-01-15', NULL, NULL);

INSERT INTO `it_assets` (`name`, `type`, `serial_number`, `status`, `license_expiry`, `assigned_to_id`, `assigned_date`) VALUES
('JetBrains License', 'Software', 'JB-USER-6', 'Assigned', '2024-12-31', 6, '2024-01-01'),
('Microsoft 365', 'Software', 'M365-001', 'Unassigned', '2024-12-31', NULL, NULL);

-- Insert Tasks
INSERT INTO `tasks` (`user_id`, `title`, `category`, `due_date`, `status`) VALUES
(6, 'Complete profile setup', 'General', '2024-01-15', 'InProgress'),
(6, 'Upload required documents', 'Paperwork', '2024-01-16', 'ToDo'),
(6, 'Set up development environment', 'IT Setup', '2024-01-20', 'ToDo'),
(6, 'Complete security training', 'Training', '2024-01-22', 'ToDo'),
(6, 'Schedule 1-on-1 with manager', 'Meetings', '2024-01-18', 'ToDo');

-- Insert Training Modules
INSERT INTO `training_modules` (`title`, `type`, `duration`, `thumbnail_url`) VALUES
('Welcome to Company', 'Video', '15 minutes', 'https://picsum.photos/400/225?random=1'),
('Company Culture', 'Video', '25 minutes', 'https://picsum.photos/400/225?random=2'),
('Security Training', 'Quiz', '20 minutes', 'https://picsum.photos/400/225?random=3'),
('Employee Handbook', 'PDF', '45 minutes', 'https://picsum.photos/400/225?random=4');

-- Insert User Training Progress
INSERT INTO `user_training_progress` (`user_id`, `module_id`, `completed`) VALUES
(6, 1, TRUE),
(6, 2, FALSE),
(6, 3, FALSE),
(6, 4, FALSE);

-- Insert Company Documents
INSERT INTO `company_documents` (`name`, `category`, `url`) VALUES
('Employee Handbook', 'HR', '/docs/handbook.pdf'),
('IT Security Policy', 'IT', '/docs/security.pdf'),
('Benefits Guide', 'HR', '/docs/benefits.pdf');

-- Insert User Documents
INSERT INTO `user_documents` (`user_id`, `name`, `status`, `action_date`) VALUES
(6, 'ID Verification', 'Verified', '2024-01-01'),
(6, 'Signed Contract', 'Uploaded', '2024-01-02'),
(6, 'Tax Forms', 'Pending', NULL);

-- Insert Notifications
INSERT INTO `notifications` (`user_id`, `message`, `is_read`, `created_at`) VALUES
(6, 'Welcome to the company! Please complete your profile.', FALSE, NOW()),
(6, 'Your IT assets have been assigned.', FALSE, DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(6, 'New training module available.', TRUE, DATE_SUB(NOW(), INTERVAL 2 HOUR));