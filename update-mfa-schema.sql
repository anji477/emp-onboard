-- Update MFA sessions table structure
DROP TABLE IF EXISTS mfa_sessions;

CREATE TABLE mfa_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  secret VARCHAR(32) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires (expires_at)
);

-- Add MFA columns to users table (MySQL compatible)
ALTER TABLE users 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret VARCHAR(32),
ADD COLUMN mfa_backup_codes JSON,
ADD COLUMN mfa_setup_completed BOOLEAN DEFAULT FALSE;