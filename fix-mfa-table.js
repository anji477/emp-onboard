// Quick script to fix MFA sessions table
import db from './db-mysql.js';

async function fixMfaTable() {
  try {
    console.log('Updating MFA sessions table...');
    
    // Update the secret column to be larger
    await db.execute('ALTER TABLE mfa_sessions MODIFY COLUMN secret VARCHAR(500) NOT NULL');
    
    console.log('✅ MFA sessions table updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating table:', error.message);
    process.exit(1);
  }
}

fixMfaTable();