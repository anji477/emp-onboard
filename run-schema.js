// run-schema.js
import fs from 'fs';
import db from './db-mysql.js';

async function runSchema() {
  try {
    const schema = fs.readFileSync('./minimal-mfa-schema.sql', 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await db.execute(statement.trim());
      }
    }
    
    console.log('✅ MFA schema updated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    process.exit(1);
  }
}

runSchema();