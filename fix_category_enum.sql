-- Fix category ENUM and empty categories
ALTER TABLE `organization_settings` 
MODIFY `category` ENUM('company','security','notifications','policies','documents','system','integrations') NOT NULL;

-- Update empty categories
UPDATE `organization_settings` SET `category` = 'system' WHERE `category` = '' AND `setting_key` IN ('backup_settings', 'maintenance_mode', 'email_settings');
UPDATE `organization_settings` SET `category` = 'integrations' WHERE `category` = '' AND `setting_key` = 'integration_settings';