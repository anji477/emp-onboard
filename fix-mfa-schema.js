// fix-mfa-schema.js - Fix MFA sessions table schema
import db from './db-mysql.js';

async function fixMfaSchema() {
  try {
    console.log('🔧 Fixing MFA sessions table schema...');

    // Drop and recreate mfa_sessions table with correct schema
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
        INDEX idx_expires (expires_at)
      )
    `);
    
    console.log('✅ Fixed mfa_sessions table schema');
    console.log('🎉 MFA schema fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing MFA schema:', error);
  } finally {
    process.exit(0);
  }
}

fixMfaSchema();