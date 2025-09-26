-- No database changes needed - your existing organization_settings table is perfect
-- Just run this to verify your settings structure:
SELECT setting_key, setting_value FROM organization_settings WHERE setting_key = 'company_info';