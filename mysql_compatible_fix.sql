-- MySQL compatible fix for settings table
-- Add missing columns (will show error if exists, but won't break)
SET sql_notes = 0;
ALTER TABLE `organization_settings` ADD COLUMN `description` TEXT;
ALTER TABLE `organization_settings` ADD COLUMN `updated_by` INT;
SET sql_notes = 1;

-- Insert missing settings
INSERT IGNORE INTO `organization_settings` (`category`, `setting_key`, `setting_value`) VALUES
('company', 'company_info', '{"name": "Your Company", "primaryColor": "#6366f1"}'),
('system', 'maintenance_mode', '{"enabled": false}'),
('security', 'password_policy', '{"minLength": 8}');