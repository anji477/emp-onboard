// reset-admin-password.js - Reset admin password to a known value
import bcrypt from 'bcrypt';
import db from './db-mysql.js';

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password...');
    
    // Set admin password to "admin123"
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update admin user (assuming admin@example.com)
    const [result] = await db.execute(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [hashedPassword, 'admin@example.com']
    );
    
    if (result.affectedRows > 0) {
      console.log('✓ Admin password reset successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
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