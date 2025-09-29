// fix-notifications-table.js
import db from './db-mysql.js';

async function enhanceNotificationsTable() {
  try {
    console.log('Enhancing notifications table...');

    // Add missing columns to notifications table
    try {
      await db.execute('ALTER TABLE notifications ADD COLUMN type ENUM("info", "success", "warning", "urgent", "task", "document", "training", "reminder", "welcome", "chat") DEFAULT "info"');
    } catch (e) { /* Column exists */ }

    try {
      await db.execute('ALTER TABLE notifications ADD COLUMN related_id INT NULL');
    } catch (e) { /* Column exists */ }

    try {
      await db.execute('ALTER TABLE notifications ADD COLUMN related_type VARCHAR(50) NULL');
    } catch (e) { /* Column exists */ }

    try {
      await db.execute('ALTER TABLE notifications ADD COLUMN priority ENUM("low", "medium", "high", "urgent") DEFAULT "medium"');
    } catch (e) { /* Column exists */ }

    try {
      await db.execute('ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMP NULL');
    } catch (e) { /* Column exists */ }

    try {
      await db.execute('ALTER TABLE notifications ADD COLUMN action_url VARCHAR(500) NULL');
    } catch (e) { /* Column exists */ }

    // Add indexes for better performance
    try {
      await db.execute('CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read)');
    } catch (e) { /* Index exists */ }

    try {
      await db.execute('CREATE INDEX idx_notifications_type ON notifications(type)');
    } catch (e) { /* Index exists */ }

    console.log('✅ Notifications table enhanced successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error enhancing notifications table:', error);
    process.exit(1);
  }
}

enhanceNotificationsTable();