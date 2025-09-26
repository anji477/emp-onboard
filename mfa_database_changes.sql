-- MFA Implementation Database Changes

-- 1. Add MFA columns to users table
ALTER TABLE `users` 
ADD COLUMN `mfa_enabled` BOOLEAN DEFAULT FALSE AFTER `onboarding_progress`,
ADD COLUMN `mfa_secret` VARCHAR(255) NULL AFTER `mfa_enabled`,
ADD COLUMN `mfa_backup_codes` JSON NULL AFTER `mfa_secret`,
ADD COLUMN `mfa_setup_completed` BOOLEAN DEFAULT FALSE AFTER `mfa_backup_codes`,
ADD COLUMN `email_otp_enabled` BOOLEAN DEFAULT FALSE AFTER `mfa_setup_completed`;

-- 2. Create MFA sessions table for temporary OTP storage
CREATE TABLE `mfa_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `session_token` VARCHAR(255) NOT NULL UNIQUE,
  `otp_code` VARCHAR(10) NOT NULL,
  `otp_type` ENUM('email', 'sms') DEFAULT 'email',
  `expires_at` TIMESTAMP NOT NULL,
  `verified` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_session_token (`session_token`),
  INDEX idx_expires_at (`expires_at`)
);

-- 3. Create trusted devices table (optional - for "remember device")
CREATE TABLE `trusted_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `device_fingerprint` VARCHAR(255) NOT NULL,
  `device_name` VARCHAR(255),
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY unique_user_device (`user_id`, `device_fingerprint`),
  INDEX idx_expires_at (`expires_at`)
);

-- 4. Add MFA settings to organization_settings
INSERT INTO `organization_settings` (`category`, `setting_key`, `setting_value`, `description`) VALUES
('security', 'mfa_policy', JSON_OBJECT(
  'enforced', false,
  'allow_email_otp', true,
  'allow_authenticator', true,
  'require_for_roles', JSON_ARRAY('Admin'),
  'grace_period_days', 7,
  'remember_device_days', 30
), 'Multi-factor authentication policy settings');

-- 5. Create MFA audit log table
CREATE TABLE `mfa_audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `action` ENUM('setup', 'verify_success', 'verify_fail', 'disable', 'backup_code_used') NOT NULL,
  `method` ENUM('authenticator', 'email', 'backup_code') NOT NULL,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `details` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX idx_user_action (`user_id`, `action`),
  INDEX idx_created_at (`created_at`)
);

-- 6. Clean up expired sessions (run this periodically)
-- DELETE FROM `mfa_sessions` WHERE `expires_at` < NOW();
-- DELETE FROM `trusted_devices` WHERE `expires_at` < NOW();