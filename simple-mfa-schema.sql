-- Simple MFA schema update
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

-- Add MFA columns to users table (ignore errors if they exist)
ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(32);
ALTER TABLE users ADD COLUMN mfa_backup_codes JSON;
ALTER TABLE users ADD COLUMN mfa_setup_completed BOOLEAN DEFAULT FALSE;