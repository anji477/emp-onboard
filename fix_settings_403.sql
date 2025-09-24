-- Fix 403 Forbidden error for /api/settings endpoint
-- Add missing columns and data to organization_settings table

-- Add missing columns (ignore errors if they exist)
ALTER TABLE `organization_settings` ADD COLUMN `description` TEXT AFTER `setting_value`;
ALTER TABLE `organization_settings` ADD COLUMN `updated_by` INT AFTER `description`;
ALTER TABLE `organization_settings` ADD UNIQUE KEY `unique_category_key` (`category`, `setting_key`);

-- Insert missing default settings that the controller expects
INSERT IGNORE INTO `organization_settings` (`category`, `setting_key`, `setting_value`, `description`) VALUES
('company', 'company_info', '{"name": "Your Company", "logo": "", "primaryColor": "#6366f1", "secondaryColor": "#f3f4f6", "darkMode": false}', 'Company branding and identity'),
('policies', 'working_hours', '{"startTime": "09:00", "endTime": "17:00", "timezone": "UTC", "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}', 'Default working hours and schedule'),
('security', 'password_policy', '{"minLength": 8, "requireUppercase": true, "requireNumbers": true, "expiryDays": 90}', 'Password requirements and policies'),
('notifications', 'notification_preferences', '{"email": {"enabled": true, "onboarding": true, "taskReminders": true}, "sms": {"enabled": false}}', 'System notification preferences'),
('system', 'backup_settings', '{"autoBackup": true, "frequency": "daily", "retentionDays": 30, "location": "cloud", "encryption": true}', 'Backup and data retention settings'),
('system', 'maintenance_mode', '{"enabled": false, "message": "System under maintenance", "allowedRoles": ["Admin"]}', 'System maintenance configuration'),
('integrations', 'integration_settings', '{"sso": {"enabled": false, "provider": "none", "domain": ""}, "slack": {"enabled": false, "webhook": ""}, "teams": {"enabled": false, "webhook": ""}}', 'Third-party integration settings');

-- Update existing email settings to match expected format
UPDATE `organization_settings` SET 
  `category` = 'system',
  `setting_key` = 'email_settings',
  `setting_value` = JSON_OBJECT(
    'smtp_host', JSON_UNQUOTE(JSON_EXTRACT(setting_value, '$')),
    'smtp_port', 587,
    'smtp_user', '',
    'smtp_password', '',
    'from_email', '',
    'from_name', 'Onboardly'
  ),
  `description` = 'Email server configuration'
WHERE `setting_key` = 'smtp_host';

-- Remove individual email settings and consolidate
DELETE FROM `organization_settings` WHERE `setting_key` IN ('smtp_port', 'smtp_secure', 'smtp_user', 'smtp_password', 'from_email', 'from_name');