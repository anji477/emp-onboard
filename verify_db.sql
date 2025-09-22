-- Verify database structure for policies table
DESCRIBE policies;

-- Check if policies table exists and has data
SELECT COUNT(*) as policy_count FROM policies;

-- Show sample policy data
SELECT id, title, category, file_url, file_name, file_type, version FROM policies LIMIT 3;