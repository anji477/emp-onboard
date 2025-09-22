-- Add sort_order column to existing policies table
ALTER TABLE `policies` ADD COLUMN `sort_order` INT DEFAULT 0 AFTER `effective_date`;

-- Update existing policies with sort_order values
UPDATE `policies` SET `sort_order` = `id` WHERE `sort_order` = 0;