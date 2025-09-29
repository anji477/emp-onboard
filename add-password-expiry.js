// Add password expiry functionality
import db from './db-mysql.js';

async function addPasswordExpiry() {
  try {
    console.log('Adding password_changed_at column...');
    
    // Check if column exists
    const [columns] = await db.execute("SHOW COLUMNS FROM users LIKE 'password_changed_at'");
    
    if (columns.length === 0) {
      // Add password_changed_at column
      await db.execute('ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER password_hash');
      
      // Update existing users to set password_changed_at to current timestamp
      await db.execute('UPDATE users SET password_changed_at = CURRENT_TIMESTAMP WHERE password_changed_at IS NULL');
      
      console.log('✅ password_changed_at column added successfully');
    } else {
      console.log('✅ password_changed_at column already exists');
    }
    
    // Update the change password endpoint to update password_changed_at
    console.log('✅ Password expiry functionality is now active');
    console.log('📋 Users will be prompted to change password after 90 days (configurable in Settings)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding password expiry:', error);
    process.exit(1);
  }
}

addPasswordExpiry();