// Script to convert existing backup codes to proper JSON format
import db from './db-mysql.js';

async function fixBackupCodes() {
  try {
    console.log('Converting backup codes to proper JSON format...');
    
    // Get all users with backup codes
    const [users] = await db.execute('SELECT id, email, mfa_backup_codes FROM users WHERE mfa_backup_codes IS NOT NULL');
    
    console.log(`Found ${users.length} users with backup codes`);
    
    for (const user of users) {
      console.log(`\nProcessing user: ${user.email}`);
      console.log('Current backup codes:', user.mfa_backup_codes);
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(user.mfa_backup_codes);
        console.log('Already valid JSON, skipping...');
        continue;
      } catch (e) {
        // Not valid JSON, need to convert
        const codesStr = user.mfa_backup_codes.toString();
        
        if (codesStr.startsWith('[') && codesStr.endsWith(']')) {
          // Extract codes from string format like "['code1', 'code2']"
          const matches = codesStr.match(/'([A-F0-9]{8})'/g);
          if (matches) {
            const backupCodes = matches.map(match => match.replace(/'/g, ''));
            const jsonCodes = JSON.stringify(backupCodes);
            
            console.log('Extracted codes:', backupCodes);
            console.log('Converting to JSON:', jsonCodes);
            
            // Update database
            await db.execute(
              'UPDATE users SET mfa_backup_codes = ? WHERE id = ?',
              [jsonCodes, user.id]
            );
            
            console.log('✅ Updated successfully');
          } else {
            console.log('❌ Could not extract codes');
          }
        } else {
          console.log('❌ Unknown format');
        }
      }
    }
    
    console.log('\n✅ Backup codes conversion completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBackupCodes();