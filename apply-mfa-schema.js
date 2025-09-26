// apply-mfa-schema.js - Run this once to add MFA columns and tables
import db from './db-mysql.js';

async function applyMfaSchema() {
  try {
    console.log('🔧 Applying MFA database schema...');

    // 1. Add MFA columns to users table
    try {
      await db.execute(`
        ALTER TABLE users 
        ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN mfa_secret VARCHAR(255) NULL,
        ADD COLUMN mfa_backup_codes JSON NULL,
        ADD COLUMN mfa_setup_completed BOOLEAN DEFAULT FALSE,
        ADD COLUMN email_otp_enabled BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added MFA columns to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ MFA columns already exist in users table');
      } else {
        throw e;
      }
    }

    // 2. Create MFA sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mfa_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        otp_code VARCHAR(10) NOT NULL,
        otp_type ENUM('email', 'sms') DEFAULT 'email',
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_session_token (session_token),
        INDEX idx_expires_at (expires_at)
      )
    `);
    console.log('✅ Created mfa_sessions table');

    // 3. Create trusted devices table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS trusted_devices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        device_fingerprint VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_device (user_id, device_fingerprint),
        INDEX idx_expires_at (expires_at)
      )
    `);
    console.log('✅ Created trusted_devices table');

    // 4. Create MFA audit log table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mfa_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action ENUM('setup', 'verify_success', 'verify_fail', 'disable', 'backup_code_used') NOT NULL,
        method ENUM('authenticator', 'email', 'backup_code') NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_action (user_id, action),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Created mfa_audit_log table');

    // 5. Add MFA settings to organization_settings
    try {
      await db.execute(`
        INSERT INTO organization_settings (category, setting_key, setting_value, description) VALUES
        ('security', 'mfa_policy', JSON_OBJECT(
          'enforced', false,
          'allow_email_otp', true,
          'allow_authenticator', true,
          'require_for_roles', JSON_ARRAY('Admin'),
          'grace_period_days', 7,
          'remember_device_days', 30
        ), 'Multi-factor authentication policy settings')
      `);
      console.log('✅ Added MFA policy settings');
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log('ℹ️ MFA policy settings already exist');
      } else {
        throw e;
      }
    }

    console.log('🎉 MFA schema applied successfully!');
    console.log('📝 You can now enable MFA in Admin Settings');
    
  } catch (error) {
    console.error('❌ Error applying MFA schema:', error);
  } finally {
    process.exit(0);
  }
}

applyMfaSchema();