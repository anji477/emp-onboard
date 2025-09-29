-- Add employee_id column to users table for bulk upload support
ALTER TABLE users ADD COLUMN employee_id VARCHAR(50) UNIQUE AFTER id;

-- Add index for better performance
CREATE INDEX idx_employee_id ON users(employee_id);

-- Update existing users with auto-generated employee IDs if they don't have one
UPDATE users SET employee_id = CONCAT('EMP', LPAD(id, 3, '0')) WHERE employee_id IS NULL;