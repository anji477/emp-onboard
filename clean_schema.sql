-- Employee Onboarding Portal Database Schema
-- Clean version with proper syntax

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
  `role` ENUM('Employee', 'Admin') NOT NULL DEFAULT 'Employee',
  `avatar_url` VARCHAR(255),
  `team` VARCHAR(100),
  `job_title` VARCHAR(100),
  `start_date` DATE,
  `onboarding_progress` INT DEFAULT 0,
  `manager_id` INT,
  `buddy_id` INT
);

-- Create other tables
CREATE TABLE `policies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `summary` TEXT,
  `content` LONGTEXT
);

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
  `assigned_date` DATE
);

CREATE TABLE `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100),
  `due_date` DATE,
  `status` ENUM('ToDo', 'InProgress', 'Completed') NOT NULL DEFAULT 'ToDo'
);

-- Insert Users
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar_url`, `team`, `job_title`, `start_date`, `onboarding_progress`) VALUES
(1, 'Harriet McMahon', 'harriet.mcmahon@example.com', 'password123', 'Admin', 'https://ui-avatars.com/api/?name=Harriet+McMahon&background=6366f1&color=fff', 'Human Resources', 'HR Manager', '2022-01-10', 100),
(2, 'Cameron Morales', 'cameron.morales@example.com', 'password123', 'Admin', 'https://ui-avatars.com/api/?name=Cameron+Morales&background=6366f1&color=fff', 'IT Department', 'IT Director', '2021-11-05', 100),
(3, 'Eleanor Pena', 'eleanor.pena@example.com', 'password123', 'Admin', 'https://ui-avatars.com/api/?name=Eleanor+Pena&background=6366f1&color=fff', 'Human Resources', 'Onboarding Specialist', '2022-08-15', 100),
(4, 'Cody Fisher', 'cody.fisher@example.com', 'password123', 'Admin', 'https://ui-avatars.com/api/?name=Cody+Fisher&background=6366f1&color=fff', 'Executive', 'CEO', '2020-02-20', 100),
(5, 'Esther Howard', 'esther.howard@example.com', 'password123', 'Admin', 'https://ui-avatars.com/api/?name=Esther+Howard&background=6366f1&color=fff', 'Engineering', 'VP of Engineering', '2021-05-01', 100),
(6, 'Alex Doe', 'alex.doe@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Alex+Doe&background=6366f1&color=fff', 'Engineering', 'Frontend Developer', '2024-01-01', 25),
(7, 'Jane Smith', 'jane.smith@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Jane+Smith&background=6366f1&color=fff', 'Engineering', 'Backend Developer', '2023-03-15', 100),
(8, 'Jacob Jones', 'jacob.jones@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Jacob+Jones&background=6366f1&color=fff', 'Engineering', 'Software Engineer', '2022-10-20', 100),
(9, 'Theresa Webb', 'theresa.webb@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Theresa+Webb&background=6366f1&color=fff', 'Engineering', 'Engineering Manager', '2022-04-11', 100),
(10, 'Wade Warren', 'wade.warren@example.com', 'password123', 'Employee', 'https://ui-avatars.com/api/?name=Wade+Warren&background=6366f1&color=fff', 'Engineering', 'DevOps Engineer', '2023-01-30', 100);

-- Insert Policies
INSERT INTO `policies` (`title`, `category`, `summary`, `content`) VALUES
('Code of Conduct', 'HR', 'Our principles on professional conduct and respect in the workplace.', 'Full text of the code of conduct policy...'),
('Work From Home Policy', 'Operations', 'Guidelines and expectations for remote work.', 'Full text of the WFH policy...'),
('Data Security Policy', 'IT', 'Rules for handling sensitive company and customer data.', 'Full text of the data security policy...'),
('Expense Reimbursement', 'Finance', 'How to claim reimbursement for business-related expenses.', 'Full text of the expense policy...');

-- Insert IT Assets
INSERT INTO `it_assets` (`name`, `type`, `serial_number`, `status`, `purchase_date`, `warranty_info`, `license_expiry`, `location`, `assigned_to_id`, `assigned_date`) VALUES
('MacBook Pro 16', 'Hardware', 'C02F1234ABCD', 'Assigned', '2023-08-15', 'AppleCare+ until 2026-08-15', NULL, 'Office', 6, '2024-01-01'),
('JetBrains License', 'Software', 'JB-USER-6', 'Assigned', NULL, NULL, '2025-12-31', NULL, 6, '2024-01-01'),
('Dell Latitude 7420', 'Hardware', 'DL7420-5678', 'Unassigned', '2023-03-10', 'Dell ProSupport until 2026-03-10', NULL, 'Warehouse', NULL, NULL),
('iPhone 15', 'Hardware', 'IP15-STOCK-01', 'Unassigned', '2024-07-15', 'Expires 2026-07-14', NULL, 'IT Storage', NULL, NULL),
('Microsoft 365 License', 'Software', 'M365-UNASSIGNED-12', 'Unassigned', NULL, NULL, '2025-09-01', NULL, NULL, NULL);

-- Insert Tasks
INSERT INTO `tasks` (`user_id`, `title`, `category`, `due_date`, `status`) VALUES
(6, 'Complete your profile information', 'General', '2024-01-15', 'Completed'),
(6, 'Upload required documents', 'Paperwork', '2024-01-16', 'InProgress'),
(6, 'Set up your development environment', 'IT Setup', '2024-01-20', 'ToDo'),
(6, 'Complete Welcome to the Team training', 'Training', '2024-01-22', 'ToDo'),
(6, 'Schedule a 1:1 with your manager', 'Meetings', '2024-01-18', 'ToDo'),
(6, 'Read the Code of Conduct policy', 'Policies', '2024-01-15', 'InProgress');