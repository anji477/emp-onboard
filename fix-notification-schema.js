// fix-notification-schema.js
import db from './db-mysql.js';

async function fixNotificationSchema() {
  try {
    console.log('Checking notifications table schema...');
    
    // Check current column definition
    const [columns] = await db.execute("SHOW COLUMNS FROM notifications LIKE 'type'");
    if (columns.length > 0) {
      console.log('Current type column:', columns[0]);
    }
    
    // Alter the type column to be longer
    console.log('Expanding type column length...');
    await db.execute("ALTER TABLE notifications MODIFY COLUMN type VARCHAR(20) DEFAULT 'info'");
    
    console.log('✅ Notification schema fixed successfully');
    
    // Verify the change
    const [newColumns] = await db.execute("SHOW COLUMNS FROM notifications LIKE 'type'");
    if (newColumns.length > 0) {
      console.log('Updated type column:', newColumns[0]);
    }
    
  } catch (error) {
    console.error('❌ Error fixing notification schema:', error.message);
  } finally {
    process.exit(0);
  }
}

fixNotificationSchema();