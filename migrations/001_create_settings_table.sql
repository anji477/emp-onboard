-- Settings table for organization-wide configuration
CREATE TABLE IF NOT EXISTS `organization_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` JSON NOT NULL,
  `category` ENUM('company', 'security', 'notifications', 'policies', 'system', 'integrations', 'compliance') NOT NULL,
  `description` TEXT,
  `updated_by` INT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_category` (`category`),
  INDEX `idx_setting_key` (`setting_key`)
);

-- Insert default settings
INSERT INTO `organization_settings` (`setting_key`, `setting_value`, `category`, `description`) VALUES
('company_info', '{"name": "Your Company", "logo": "", "primaryColor": "#6366f1", "secondaryColor": "#f3f4f6"}', 'company', 'Company branding and identity'),
('working_hours', '{"startTime": "09:00", "endTime": "17:00", "timezone": "UTC", "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}', 'policies', 'Default working hours and schedule'),
('leave_policy', '{"annualLeave": 25, "sickLeave": 10, "maternityLeave": 90, "paternityLeave": 14, "carryOverLimit": 5}', 'policies', 'Leave entitlements and policies'),
('password_policy', '{"minLength": 8, "requireUppercase": true, "requireLowercase": true, "requireNumbers": true, "requireSpecialChars": true, "expiryDays": 90}', 'security', 'Password requirements and policies'),
('mfa_settings', '{"required": false, "methods": ["email", "sms"], "gracePeriod": 7}', 'security', 'Multi-factor authentication settings'),
('notification_preferences', '{"email": {"enabled": true, "onboarding": true, "taskReminders": true, "systemAlerts": true}, "sms": {"enabled": false, "urgentOnly": true}}', 'notifications', 'System notification preferences'),
('backup_settings', '{"autoBackup": true, "frequency": "daily", "retentionDays": 30, "location": "cloud", "encryption": true}', 'system', 'Backup and data retention settings'),
('maintenance_mode', '{"enabled": false, "message": "System under maintenance", "allowedRoles": ["Admin"], "scheduledStart": null, "scheduledEnd": null}', 'system', 'System maintenance configuration'),
('integration_settings', '{"sso": {"enabled": false, "provider": "none", "domain": ""}, "slack": {"enabled": false, "webhook": ""}, "teams": {"enabled": false, "webhook": ""}}', 'integrations', 'Third-party integration settings'),
('audit_settings', '{"enabled": true, "logLevel": "info", "retentionDays": 90, "trackUserActions": true, "trackSystemEvents": true}', 'compliance', 'Audit logging and compliance settings'),
('performance_settings', '{"cacheEnabled": true, "cacheTTL": 300, "maxFileSize": 10485760, "sessionTimeout": 3600, "rateLimiting": {"enabled": true, "maxRequests": 100}}', 'system', 'Performance and resource management');