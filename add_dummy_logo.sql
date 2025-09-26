-- Add dummy logo to company settings
UPDATE `organization_settings` 
SET `setting_value` = JSON_SET(
    `setting_value`, 
    '$.logo', 
    'https://ui-avatars.com/api/?name=MyDigitalAccounts&background=0306b0&color=fff&size=128&rounded=true&bold=true'
) 
WHERE `setting_key` = 'company_info';