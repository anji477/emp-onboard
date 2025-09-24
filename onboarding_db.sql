-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 24, 2025 at 01:25 PM
-- Server version: 8.0.29
-- PHP Version: 8.2.1

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `onboarding_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `company_documents`
--

CREATE TABLE `company_documents` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url` varchar(255) COLLATE utf8mb4_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `company_documents`
--

INSERT INTO `company_documents` (`id`, `name`, `category`, `url`) VALUES
(1, 'Employee Handbook', 'HR', '/docs/handbook.pdf'),
(2, 'IT Security Policy', 'IT', '/docs/security.pdf'),
(3, 'Benefits Guide', 'HR', '/docs/benefits.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `document_templates`
--

CREATE TABLE `document_templates` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `category` varchar(100) COLLATE utf8mb4_general_ci DEFAULT 'General',
  `priority` enum('Low','Medium','High','Critical') COLLATE utf8mb4_general_ci DEFAULT 'Medium',
  `due_in_days` int DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `document_templates`
--

INSERT INTO `document_templates` (`id`, `name`, `description`, `category`, `priority`, `due_in_days`, `is_required`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'ID Card Copy', 'Government issued photo identification', 'Identity', 'High', 7, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(2, 'Resume/CV', 'Current resume or curriculum vitae', 'Professional', 'Medium', 14, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(3, 'Tax Forms (W-4)', 'Federal tax withholding forms', 'Tax', 'Critical', 3, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(4, 'Emergency Contact Form', 'Emergency contact information', 'Personal', 'High', 7, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(5, 'Bank Details', 'Direct deposit authorization form', 'Financial', 'High', 7, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(6, 'Background Check Authorization', 'Authorization for background verification', 'Legal', 'Critical', 5, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(7, 'Signed Offer Letter', 'Signed employment offer letter', 'Legal', 'Critical', 3, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54'),
(8, 'I-9 Form', 'Employment eligibility verification', 'Legal', 'Critical', 3, 1, 1, 1, '2025-09-23 14:38:54', '2025-09-23 14:38:54');

-- --------------------------------------------------------

--
-- Table structure for table `it_assets`
--

CREATE TABLE `it_assets` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `type` enum('Hardware','Software') COLLATE utf8mb4_general_ci NOT NULL,
  `serial_number` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` enum('Assigned','Unassigned','PendingReturn','Returned') COLLATE utf8mb4_general_ci NOT NULL,
  `purchase_date` date DEFAULT NULL,
  `warranty_info` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `license_expiry` date DEFAULT NULL,
  `location` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `assigned_to_id` int DEFAULT NULL,
  `assigned_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `it_assets`
--

INSERT INTO `it_assets` (`id`, `name`, `type`, `serial_number`, `status`, `purchase_date`, `warranty_info`, `license_expiry`, `location`, `assigned_to_id`, `assigned_date`) VALUES
(1, 'MacBook Pro 16', 'Hardware', 'C02F1234ABCD', 'Assigned', '2023-08-15', 'AppleCare+ until 2026-08-15', NULL, NULL, 6, '2024-01-01'),
(2, 'Dell Latitude 7420', 'Hardware', 'DL7420-5678', 'Unassigned', '2023-03-10', 'Dell ProSupport until 2026-03-10', NULL, NULL, NULL, NULL),
(3, 'iPhone 15', 'Hardware', 'IP15-001', 'Unassigned', '2024-01-15', 'Apple Warranty until 2026-01-15', NULL, NULL, NULL, NULL),
(4, 'JetBrains License', 'Software', 'JB-USER-6', 'Assigned', NULL, NULL, '2024-12-31', NULL, 6, '2024-01-01'),
(5, 'Microsoft 365', 'Software', 'M365-001', 'Unassigned', NULL, NULL, '2024-12-31', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `message`, `is_read`, `created_at`) VALUES
(1, 6, 'Welcome to the company! Please complete your profile.', 1, '2025-09-15 19:19:26'),
(2, 6, 'Your IT assets have been assigned.', 1, '2025-09-15 18:19:26'),
(3, 6, 'New training module available.', 1, '2025-09-15 17:19:26');

-- --------------------------------------------------------

--
-- Table structure for table `organization_settings`
--

CREATE TABLE `organization_settings` (
  `id` int NOT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `setting_value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `category` enum('company','security','notifications','policies','documents','system','integrations') COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `organization_settings`
--

INSERT INTO `organization_settings` (`id`, `setting_key`, `setting_value`, `category`, `description`, `updated_by`, `updated_at`, `created_at`) VALUES
(1, 'company_info', '{\"name\":\"MyDigitalAccounts\",\"logo\":\"\",\"primaryColor\":\"#0306b0\",\"secondaryColor\":\"#3e5fa3\",\"darkMode\":false}', 'company', 'Company branding and identity', 9, '2025-09-23 07:48:18', '2025-09-18 08:33:42'),
(2, 'working_hours', '{\"startTime\":\"09:00\",\"endTime\":\"17:00\",\"timezone\":\"UTC\",\"workingDays\":[\"Monday\",\"Tuesday\",\"Wednesday\",\"Thursday\",\"Friday\"]}', 'policies', 'Default working hours', 9, '2025-09-23 07:48:18', '2025-09-18 08:33:42'),
(3, 'password_policy', '{\"minLength\":8,\"requireUppercase\":true,\"requireNumbers\":true,\"expiryDays\":90,\"requireSymbols\":true}', 'security', 'Password requirements', 9, '2025-09-23 07:48:18', '2025-09-18 08:33:42'),
(4, 'notification_preferences', '{\"email\":{\"enabled\":true,\"onboarding\":true,\"taskReminders\":true},\"sms\":{\"enabled\":false}}', 'notifications', 'Notification settings', 9, '2025-09-23 07:48:18', '2025-09-18 08:33:42'),
(9, 'backup_settings', '{\"autoBackup\":true,\"frequency\":\"daily\",\"retentionDays\":30,\"location\":\"cloud\",\"encryption\":true}', 'system', NULL, 9, '2025-09-24 13:16:55', '2025-09-22 08:22:02'),
(10, 'maintenance_mode', '{\"enabled\":true,\"message\":\"System under maintenance\",\"allowedRoles\":[\"Admin\"]}', 'system', NULL, 9, '2025-09-24 13:16:55', '2025-09-22 08:22:02'),
(11, 'integration_settings', '{\"sso\":{\"enabled\":false,\"provider\":\"none\",\"domain\":\"\"},\"slack\":{\"enabled\":false,\"webhook\":\"\"},\"teams\":{\"enabled\":false,\"webhook\":\"\"}}', 'integrations', NULL, 9, '2025-09-24 13:16:55', '2025-09-22 08:22:02'),
(33, 'email_settings', '{\"smtp_host\":\"email-smtp.eu-west-1.amazonaws.com\",\"smtp_port\":587,\"smtp_user\":\"AKIAQHC5GV6YUGRV7G6A\",\"smtp_password\":\"BH8bi78DVX3pkpAAgPr1YdMrQSs4yZzh2TlbZgzN9rpV\",\"from_email\":\"jahith.hussain@mydigitalaccounts.com\",\"from_name\":\"Onboardly\"}', 'system', NULL, 9, '2025-09-24 13:16:55', '2025-09-22 11:47:28');

-- --------------------------------------------------------

--
-- Table structure for table `policies`
--

CREATE TABLE `policies` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `summary` text COLLATE utf8mb4_general_ci,
  `content` longtext COLLATE utf8mb4_general_ci,
  `file_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `version` varchar(50) COLLATE utf8mb4_general_ci DEFAULT '1.0',
  `effective_date` date DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `policies`
--

INSERT INTO `policies` (`id`, `title`, `category`, `summary`, `content`, `file_url`, `file_name`, `file_size`, `file_type`, `version`, `effective_date`, `sort_order`, `created_by`, `updated_at`, `created_at`) VALUES
(1, 'Code of Conduct', 'HR', 'Company conduct guidelines', 'All employees must maintain professional behavior and treat colleagues with respect.', NULL, NULL, NULL, NULL, '1.0', NULL, 1, NULL, '2025-09-18 13:40:36', '2025-09-18 13:17:22'),
(2, 'Work From Home Policy', 'Operations', 'Remote work guidelines', 'Employees may work remotely up to 2 days per week with manager approval.', NULL, NULL, NULL, NULL, '1.0', NULL, 2, NULL, '2025-09-18 13:40:36', '2025-09-18 13:17:22'),
(3, 'IT Security Policy', 'IT', 'Security requirements', 'All employees must use strong passwords and enable two-factor authentication.', NULL, NULL, NULL, NULL, '1.0', NULL, 3, NULL, '2025-09-18 13:40:36', '2025-09-18 13:17:22'),
(4, 'Expense Reimbursement', 'Finance', 'Expense policy', 'Submit expenses within 30 days with proper receipts and documentation.', NULL, NULL, NULL, NULL, '1.0', NULL, 4, NULL, '2025-09-18 13:40:36', '2025-09-18 13:17:22'),
(8, 'ISMS Employee Trainings', 'IT', 'ISMS Employee Training PPT', '', '/uploads/policyFile-1758633424808-374068884.pdf', 'ISMS-APEX1-Policy.pdf', 73825, 'application/pdf', '1.0', '0000-00-00', 8, 1, '2025-09-23 13:23:31', '2025-09-23 13:17:04');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('ToDo','InProgress','Completed') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'ToDo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `user_id`, `title`, `category`, `due_date`, `status`) VALUES
(1, 6, 'Complete profile setup', 'General', '2024-01-15', 'Completed'),
(2, 6, 'Upload required documents', 'Paperwork', '2024-01-16', 'Completed'),
(3, 6, 'Set up development environment', 'IT Setup', '2024-01-20', 'Completed'),
(4, 6, 'Complete security training', 'Training', '2024-01-22', 'Completed'),
(5, 6, 'Schedule 1-on-1 with manager', 'Meetings', '2024-01-18', 'Completed'),
(6, 1, 'Complete profile setup', 'General', '2024-01-15', 'Completed'),
(7, 1, 'Upload required documents', 'Paperwork', '2024-01-16', 'Completed'),
(8, 1, 'Complete security training', 'Training', '2024-01-22', 'ToDo'),
(9, 9, 'Complete profile setup', 'General', '2024-01-15', ''),
(10, 9, 'Upload required documents', 'Paperwork', '2024-01-16', ''),
(11, 9, 'Complete security training', 'Training', '2024-01-22', ''),
(12, 6, 'sss', 'Paperwork', '2025-09-20', 'Completed'),
(13, 6, 'ssssss', 'IT Setup', '2025-09-20', '');

-- --------------------------------------------------------

--
-- Table structure for table `task_categories`
--

CREATE TABLE `task_categories` (
  `id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `color` varchar(7) COLLATE utf8mb4_general_ci DEFAULT '#6366f1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `task_categories`
--

INSERT INTO `task_categories` (`id`, `name`, `description`, `color`, `is_active`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'General', 'General onboarding tasks', '#6366f1', 1, 1, '2025-09-22 15:16:58', '2025-09-22 15:16:58'),
(2, 'Paperwork', 'Document and form completion tasks', '#10b981', 1, 1, '2025-09-22 15:16:58', '2025-09-22 15:16:58'),
(3, 'IT Setup', 'Technology and system setup tasks', '#f59e0b', 1, 1, '2025-09-22 15:16:58', '2025-09-22 15:16:58'),
(4, 'Training', 'Learning and training related tasks', '#8b5cf6', 1, 1, '2025-09-22 15:16:58', '2025-09-22 15:16:58'),
(5, 'HR', 'Human resources related tasks', '#ef4444', 1, 1, '2025-09-22 15:16:58', '2025-09-22 15:16:58'),
(6, 'Compliance', 'Compliance and policy related tasks', '#06b6d4', 1, 1, '2025-09-22 15:16:58', '2025-09-22 15:16:58'),
(7, 'ss', 'ss', '#6366f1', 0, 9, '2025-09-22 15:17:50', '2025-09-22 15:17:56');

-- --------------------------------------------------------

--
-- Table structure for table `training_modules`
--

CREATE TABLE `training_modules` (
  `id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `type` enum('Video','PDF','DOC','Quiz') COLLATE utf8mb4_general_ci NOT NULL,
  `duration` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `thumbnail_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `training_modules`
--

INSERT INTO `training_modules` (`id`, `title`, `type`, `duration`, `thumbnail_url`, `file_url`) VALUES
(5, 'test', 'PDF', '40', 'https://picsum.photos/400/225?random=1758197184782', '/uploads/trainingFile-1758197184740-125278989.pdf'),
(6, 'ss', 'PDF', 'sss', 'https://picsum.photos/400/225?random=1758197875341', '/uploads/trainingFile-1758197875336-699014287.docx'),
(7, 'dddd', 'DOC', '54 min', 'https://picsum.photos/400/225?random=1758198407602', '/uploads/trainingFile-1758198407595-919255001.docx'),
(8, 'vid', 'Video', '30 min', 'https://picsum.photos/400/225?random=1758198937591', '/uploads/trainingFile-1758198936538-414262152.mp4'),
(9, 'sAS', 'PDF', '30 mins', 'https://picsum.photos/400/225?random=1758535008615', '/uploads/trainingFile-1758535008603-377805771.pdf'),
(10, 'Content', 'PDF', '30 min', 'https://picsum.photos/400/225?random=1758633910490', '/uploads/trainingFile-1758633910487-711891806.pdf');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('Employee','Admin','HR') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Employee',
  `avatar_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `team` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `job_title` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `onboarding_progress` int DEFAULT '0',
  `manager_id` int DEFAULT NULL,
  `buddy_id` int DEFAULT NULL,
  `invitation_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `invitation_expires` datetime DEFAULT NULL,
  `reset_token` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reset_expires` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `avatar_url`, `team`, `job_title`, `start_date`, `onboarding_progress`, `manager_id`, `buddy_id`, `invitation_token`, `invitation_expires`, `reset_token`, `reset_expires`) VALUES
(1, 'Admin User', 'admin@example.com', '$2b$12$Ll7fnC5/XG0bTeF3h1QjsOe.qIcPnO82HA4HypFEFV9Ue0/ZX/hI2', 'Admin', 'https://ui-avatars.com/api/?name=Admin+User&background=6366f1&color=fff', 'Management', 'Administrator', '2022-01-01', 53, NULL, NULL, NULL, NULL, NULL, NULL),
(6, 'Alex Doe', 'user@example.com', '$2b$12$Kv26zvuQdk5ktZaln6JjIesW8VcBvG1H2Qdppw9wpNIh8CNB8oMrq', 'Employee', 'https://ui-avatars.com/api/?name=Alex+Doe&background=6366f1&color=fff', 'Engineering', 'Developer', '2024-01-01', 83, NULL, NULL, NULL, NULL, NULL, NULL),
(8, 'HR Manager', 'hr@example.com', '$2b$12$QM3JmAOjVDMDBSvWOPYxvec0jRgBdFYIO0xiZADGGnroVaJ1p0jMe', 'HR', 'https://ui-avatars.com/api/?name=HR+Manager&background=6366f1&color=fff', 'Human Resources', 'HR Manager', '2022-01-01', 0, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 'Anji Reddy', 'anji.reddy@mydigitalaccounts.com', '$2b$12$DVrMee1e.9RX9gpg.usBUOGZObBkQ/oEAMyW4uN7G0KwD52SCLq/C', 'Employee', 'https://ui-avatars.com/api/?name=Anji%20Reddy&background=6366f1&color=fff', 'IT', 'Network and DevOps Manager', '2025-09-18', 43, NULL, NULL, NULL, NULL, '4szt3hl0x6nmfv7wdy7', '2025-09-22 09:54:24'),
(12, 'Martin Joseph', 'martin.joseph@mydigitalaccounts.com', '$2b$12$2mhIjIuBuNcm8wPYcJzN3.8JQjOHspi4BZGjppuhmUiCEO09vHFDa', 'Employee', 'https://ui-avatars.com/api/?name=Martin%20Joseph&background=6366f1&color=fff', 'dev', 'dev', '2025-09-22', 25, NULL, NULL, NULL, NULL, NULL, NULL),
(13, 'Test Employee', 'employee@test.com', '$2b$12$7Za9sHY0/wl0Fpq9qLbscuZfUVstdbpJ7j6k.bPxsC3klNpdRax..', 'Employee', 'https://ui-avatars.com/api/?name=Test+Employee&background=6366f1&color=fff', 'Testing', 'Test User', '2024-01-01', 0, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_assignments`
--

CREATE TABLE `user_assignments` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `item_type` enum('task','policy','training','document') COLLATE utf8mb4_general_ci NOT NULL,
  `item_id` int NOT NULL,
  `assigned_by` int NOT NULL,
  `assigned_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` date DEFAULT NULL,
  `status` enum('pending','completed') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `completed_date` timestamp NULL DEFAULT NULL,
  `is_required` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_assignments`
--

INSERT INTO `user_assignments` (`id`, `user_id`, `item_type`, `item_id`, `assigned_by`, `assigned_date`, `due_date`, `status`, `completed_date`, `is_required`) VALUES
(1, 12, 'task', 1, 1, '2025-09-22 12:27:45', '2025-09-26', 'completed', '2025-09-22 12:32:50', 1),
(2, 12, 'task', 2, 1, '2025-09-22 12:27:45', '2025-09-26', 'completed', '2025-09-22 12:32:54', 1),
(3, 12, 'task', 3, 1, '2025-09-22 13:15:02', '2025-09-23', 'pending', NULL, 1),
(4, 12, 'task', 4, 1, '2025-09-22 13:15:02', '2025-09-23', 'pending', NULL, 1),
(5, 12, 'training', 8, 9, '2025-09-23 12:42:53', '0000-00-00', 'pending', NULL, 1),
(6, 12, 'training', 7, 9, '2025-09-23 12:42:53', '0000-00-00', 'pending', NULL, 1),
(7, 12, 'policy', 1, 9, '2025-09-23 12:45:08', '0000-00-00', 'pending', NULL, 1),
(8, 12, 'policy', 3, 9, '2025-09-23 12:46:52', '0000-00-00', 'pending', NULL, 1),
(9, 12, 'policy', 5, 9, '2025-09-23 12:46:52', '0000-00-00', 'pending', NULL, 1),
(10, 12, 'task', 13, 9, '2025-09-23 12:47:34', '0000-00-00', 'pending', NULL, 1),
(11, 12, 'task', 12, 9, '2025-09-23 12:47:34', '0000-00-00', 'pending', NULL, 1),
(12, 12, 'policy', 6, 9, '2025-09-23 12:47:34', '0000-00-00', 'pending', NULL, 1),
(13, 12, 'policy', 4, 9, '2025-09-23 12:49:09', '0000-00-00', 'pending', NULL, 1),
(14, 12, 'policy', 2, 9, '2025-09-23 12:49:26', '0000-00-00', 'pending', NULL, 1),
(15, 12, 'task', 9, 9, '2025-09-23 12:51:28', '0000-00-00', 'pending', NULL, 1),
(16, 12, 'policy', 1, 9, '2025-09-23 12:51:54', '0000-00-00', 'pending', NULL, 1),
(17, 12, 'task', 13, 9, '2025-09-23 12:51:54', '0000-00-00', 'pending', NULL, 1),
(18, 12, 'task', 12, 9, '2025-09-23 12:51:54', '0000-00-00', 'pending', NULL, 1),
(19, 12, 'task', 11, 9, '2025-09-23 12:53:40', '0000-00-00', 'pending', NULL, 1),
(20, 9, 'training', 10, 9, '2025-09-23 13:30:06', '0000-00-00', 'pending', NULL, 1),
(21, 9, 'policy', 1, 9, '2025-09-23 15:15:55', '0000-00-00', 'pending', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_documents`
--

CREATE TABLE `user_documents` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `status` enum('Pending','Uploaded','InReview','Verified','Rejected','Overdue','Expired') COLLATE utf8mb4_general_ci DEFAULT 'Pending',
  `action_date` date DEFAULT NULL,
  `rejection_reason` text COLLATE utf8mb4_general_ci,
  `file_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `priority` enum('Low','Medium','High','Critical') COLLATE utf8mb4_general_ci DEFAULT 'Medium',
  `due_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_documents`
--

INSERT INTO `user_documents` (`id`, `user_id`, `name`, `status`, `action_date`, `rejection_reason`, `file_url`, `file_name`, `file_size`, `file_type`, `uploaded_at`, `priority`, `due_date`, `created_at`) VALUES
(1, 6, 'ID Verification', 'Verified', '2025-09-18', NULL, NULL, NULL, NULL, NULL, '2025-09-18 11:39:48', 'Medium', NULL, '2025-09-23 14:38:54'),
(2, 6, 'Signed Contract', 'Uploaded', '2024-01-02', NULL, NULL, NULL, NULL, NULL, '2025-09-18 11:29:15', 'Medium', NULL, '2025-09-23 14:38:54'),
(3, 6, 'Tax Forms', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-18 11:29:15', 'Medium', NULL, '2025-09-23 14:38:54'),
(4, 9, 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 'Rejected', '2025-09-18', 'asas', '/uploads/document-1758195040455-575482195.docx', 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 20688, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-09-18 11:42:34', 'Medium', NULL, '2025-09-23 14:38:54'),
(5, 9, 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 'Verified', '2025-09-18', NULL, '/uploads/document-1758195064815-916413732.docx', 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 20688, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-09-18 11:42:22', 'Medium', NULL, '2025-09-23 14:38:54'),
(6, 9, 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 'Verified', '2025-09-18', NULL, '/uploads/document-1758195285738-28536021.docx', 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 20688, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-09-18 11:42:42', 'Medium', NULL, '2025-09-23 14:38:54'),
(7, 9, 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 'Verified', '2025-09-18', NULL, '/uploads/document-1758195430505-127482510.docx', 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 20688, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-09-18 12:22:45', 'Medium', NULL, '2025-09-23 14:38:54'),
(8, 9, 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 'Uploaded', NULL, NULL, '/uploads/document-1758634282851-73020098.pdf', 'ISMS-APEX1-Policy.pdf', 73825, 'application/pdf', '2025-09-23 13:31:22', 'Medium', NULL, '2025-09-23 14:38:54'),
(9, 9, 'Mda Multi-arch Ci_cd + Base Image Standards (base & App).docx', 'Verified', '2025-09-23', NULL, '/uploads/document-1758634293685-780773567.pdf', 'ISMS-APEX1-Policy.pdf', 73825, 'application/pdf', '2025-09-23 13:46:52', 'Medium', NULL, '2025-09-23 14:38:54'),
(10, 9, 'id card', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 14:39:55', 'Medium', NULL, '2025-09-23 14:39:55'),
(11, 12, 'Tax', 'Verified', '2025-09-23', NULL, '/uploads/document-1758639364471-803677153.docx', 'trainingFile-1758197875336-699014287 (1).docx', 20688, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '2025-09-23 14:56:26', 'Medium', NULL, '2025-09-23 14:44:17'),
(12, 9, 'ISMS-APEX2-Scope.pdf', 'Verified', '2025-09-23', NULL, '/uploads/document-1758639126050-704243932.pdf', 'ISMS-APEX2-Scope.pdf', 59704, 'application/pdf', '2025-09-23 14:56:44', 'Medium', NULL, '2025-09-23 14:52:06'),
(13, 12, 'Upload Your passphoto', 'Pending', NULL, NULL, NULL, NULL, NULL, NULL, '2025-09-23 15:06:15', 'Medium', NULL, '2025-09-23 15:06:15');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('Employee','Manager','HR','Admin','IT') COLLATE utf8mb4_general_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role`, `is_active`, `created_at`) VALUES
(1, 1, 'Admin', 1, '2025-09-23 11:30:14'),
(2, 6, 'Employee', 1, '2025-09-23 10:28:52'),
(3, 8, 'HR', 1, '2025-09-23 10:28:52'),
(4, 9, 'Employee', 1, '2025-09-23 11:35:06'),
(5, 12, 'Employee', 1, '2025-09-23 10:28:52'),
(6, 13, 'Employee', 1, '2025-09-23 10:28:52'),
(8, 1, 'Employee', 1, '2025-09-23 11:30:03'),
(9, 8, 'Employee', 1, '2025-09-23 10:28:52'),
(10, 6, 'Admin', 1, '2025-09-23 10:28:52'),
(11, 9, 'Admin', 1, '2025-09-23 11:35:01');

-- --------------------------------------------------------

--
-- Table structure for table `user_training_progress`
--

CREATE TABLE `user_training_progress` (
  `id` int NOT NULL,
  `user_id` int NOT NULL,
  `module_id` int NOT NULL,
  `completed` tinyint(1) DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_training_progress`
--

INSERT INTO `user_training_progress` (`id`, `user_id`, `module_id`, `completed`) VALUES
(5, 9, 5, 1),
(6, 6, 8, 1),
(7, 1, 5, 1),
(8, 1, 6, 1),
(9, 1, 7, 1),
(10, 1, 8, 1),
(11, 1, 9, 1),
(12, 9, 10, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `company_documents`
--
ALTER TABLE `company_documents`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `it_assets`
--
ALTER TABLE `it_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `serial_number` (`serial_number`),
  ADD KEY `assigned_to_id` (`assigned_to_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `organization_settings`
--
ALTER TABLE `organization_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `policies`
--
ALTER TABLE `policies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_policies_created_by` (`created_by`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `task_categories`
--
ALTER TABLE `task_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `training_modules`
--
ALTER TABLE `training_modules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `manager_id` (`manager_id`),
  ADD KEY `buddy_id` (`buddy_id`);

--
-- Indexes for table `user_assignments`
--
ALTER TABLE `user_assignments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `assigned_by` (`assigned_by`);

--
-- Indexes for table `user_documents`
--
ALTER TABLE `user_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_role` (`user_id`,`role`);

--
-- Indexes for table `user_training_progress`
--
ALTER TABLE `user_training_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`module_id`),
  ADD KEY `module_id` (`module_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `company_documents`
--
ALTER TABLE `company_documents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `document_templates`
--
ALTER TABLE `document_templates`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `it_assets`
--
ALTER TABLE `it_assets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `organization_settings`
--
ALTER TABLE `organization_settings`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `policies`
--
ALTER TABLE `policies`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `task_categories`
--
ALTER TABLE `task_categories`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `training_modules`
--
ALTER TABLE `training_modules`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `user_assignments`
--
ALTER TABLE `user_assignments`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `user_documents`
--
ALTER TABLE `user_documents`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `user_training_progress`
--
ALTER TABLE `user_training_progress`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `document_templates`
--
ALTER TABLE `document_templates`
  ADD CONSTRAINT `document_templates_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `it_assets`
--
ALTER TABLE `it_assets`
  ADD CONSTRAINT `it_assets_ibfk_1` FOREIGN KEY (`assigned_to_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_settings`
--
ALTER TABLE `organization_settings`
  ADD CONSTRAINT `organization_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `policies`
--
ALTER TABLE `policies`
  ADD CONSTRAINT `fk_policies_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_categories`
--
ALTER TABLE `task_categories`
  ADD CONSTRAINT `task_categories_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `users_ibfk_2` FOREIGN KEY (`buddy_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_assignments`
--
ALTER TABLE `user_assignments`
  ADD CONSTRAINT `user_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_assignments_ibfk_2` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_documents`
--
ALTER TABLE `user_documents`
  ADD CONSTRAINT `user_documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_training_progress`
--
ALTER TABLE `user_training_progress`
  ADD CONSTRAINT `user_training_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_training_progress_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `training_modules` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
