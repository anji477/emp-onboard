// fix-mfa-sessions.js - Fix MFA sessions table structure
import db from './db-mysql.js';

async function fixMfaSessions() {
  try {
    console.log('🔧 Fixing MFA sessions table structure...');

    // Drop and recreate the mfa_sessions table with correct structure
    await db.execute('DROP TABLE IF EXISTS mfa_sessions');
    
    await db.execute(`
      CREATE TABLE mfa_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(64) NOT NULL UNIQUE,
        secret VARCHAR(32),
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_token (session_token),
        INDEX idx_user_id (user_id),
        INDEX idx_expires (expires_at)
      )
    `);
    
    console.log('✅ MFA sessions table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing MFA sessions table:', error);
  } finally {
    process.exit(0);
  }
}

fixMfaSessions();