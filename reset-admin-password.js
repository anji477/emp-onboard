// reset-admin-password.js - Reset admin password securely
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import db from './db-mysql.js';

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password...');
    
    // Generate secure random password
    const newPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update admin user (assuming admin@example.com)
    const [result] = await db.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'admin@example.com']
    );
    
    if (result.affectedRows > 0) {
      console.log('✓ Admin password reset successfully!');
      console.log('Email: admin@example.com');
      console.log('⚠️  New password generated - check secure logs for details');
      
      // Log password to secure location only (not console)
      const fs = await import('fs');
      const logEntry = `${new Date().toISOString()} - Admin password reset: ${newPassword}\n`;
      fs.default.appendFileSync('./admin-passwords.log', logEntry, { mode: 0o600 });
    } else {
      console.log('Admin user not found');
    }
    
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await db.end();
  }
}

resetAdminPassword();