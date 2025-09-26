-- MFA Sessions Table
CREATE TABLE IF NOT EXISTS mfa_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  secret VARCHAR(32),
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_session_token (session_token),
  INDEX idx_expires (expires_at)
);

-- Add MFA columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(32),
ADD COLUMN IF NOT EXISTS mfa_backup_codes JSON,
ADD COLUMN IF NOT EXISTS mfa_setup_completed BOOLEAN DEFAULT FALSE;

-- Cleanup expired sessions (run periodically)
DELETE FROM mfa_sessions WHERE expires_at < NOW();