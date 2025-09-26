-- Safe MFA schema update (handles existing columns)
DROP TABLE IF EXISTS mfa_sessions;

CREATE TABLE mfa_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  secret VARCHAR(32),
  otp_code VARCHAR(10),
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires (expires_at)
);

-- Add MFA columns safely (check existence first)
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mfa_enabled') = 0,
  'ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE',
  'SELECT "mfa_enabled column already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mfa_secret') = 0,
  'ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(32)',
  'SELECT "mfa_secret column already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mfa_backup_codes') = 0,
  'ALTER TABLE users ADD COLUMN mfa_backup_codes JSON',
  'SELECT "mfa_backup_codes column already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mfa_setup_completed') = 0,
  'ALTER TABLE users ADD COLUMN mfa_setup_completed BOOLEAN DEFAULT FALSE',
  'SELECT "mfa_setup_completed column already exists" as message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;