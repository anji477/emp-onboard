-- Add missing columns to policies table for file upload support
ALTER TABLE `policies` 
ADD COLUMN `file_url` VARCHAR(255) AFTER `content`,
ADD COLUMN `file_name` VARCHAR(255) AFTER `file_url`,
ADD COLUMN `file_size` INT AFTER `file_name`,
ADD COLUMN `file_type` VARCHAR(100) AFTER `file_size`,
ADD COLUMN `version` VARCHAR(50) DEFAULT '1.0' AFTER `file_type`,
ADD COLUMN `effective_date` DATE AFTER `version`,
ADD COLUMN `created_by` INT AFTER `effective_date`,
ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_by`,
ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `updated_at`;

-- Add foreign key constraint
ALTER TABLE `policies` 
ADD CONSTRAINT `fk_policies_created_by` 
FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;