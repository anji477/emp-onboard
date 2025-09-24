-- Safer fix - only adds missing structure and data without modifying existing
ALTER TABLE `organization_settings` 
ADD COLUMN IF NOT EXISTS `description` TEXT AFTER `setting_value`,
ADD COLUMN IF NOT EXISTS `updated_by` INT AFTER `description`;

-- Only add missing settings (won't overwrite existing)
INSERT IGNORE INTO `organization_settings` (`category`, `setting_key`, `setting_value`, `description`) VALUES
('company', 'company_info', '{"name": "Your Company", "logo": "", "primaryColor": "#6366f1"}', 'Company branding'),
('system', 'maintenance_mode', '{"enabled": false}', 'Maintenance mode'),
('security', 'password_policy', '{"minLength": 8}', 'Password policy');