-- Just add missing settings data
INSERT IGNORE INTO `organization_settings` (`category`, `setting_key`, `setting_value`) VALUES
('company', 'company_info', '{"name": "Your Company", "primaryColor": "#6366f1"}'),
('system', 'maintenance_mode', '{"enabled": false}'),
('security', 'password_policy', '{"minLength": 8}');