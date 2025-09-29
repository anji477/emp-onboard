// fix-hr-chat-schema.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
};

async function fixHRChatSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Add missing columns for HR chat functionality
    console.log('Adding HR chat columns...');
    
    // Add last_hr_read to track read status
    try {
      await connection.execute(`
        ALTER TABLE chat_conversations 
        ADD COLUMN last_hr_read TIMESTAMP NULL,
        ADD COLUMN assigned_hr_id INT NULL,
        ADD COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        ADD COLUMN tags JSON NULL,
        ADD FOREIGN KEY (assigned_hr_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added HR tracking columns');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('HR columns may already exist:', error.message);
      }
    }
    
    // Add message read tracking
    try {
      await connection.execute(`
        ALTER TABLE chat_messages 
        ADD COLUMN is_read BOOLEAN DEFAULT FALSE,
        ADD COLUMN read_at TIMESTAMP NULL,
        ADD COLUMN read_by INT NULL,
        ADD COLUMN message_status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
        ADD FOREIGN KEY (read_by) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added message tracking columns');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('Message tracking columns may already exist:', error.message);
      }
    }
    
    // Create chat_notifications table for real-time updates
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        conversation_id INT NOT NULL,
        message_id INT NOT NULL,
        notification_type ENUM('new_message', 'message_read', 'typing', 'hr_assigned') NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
        INDEX idx_user_unread (user_id, is_read),
        INDEX idx_conversation (conversation_id)
      ) CHARACTER SET utf8 COLLATE utf8_unicode_ci
    `);
    console.log('✅ Created chat_notifications table');
    
    // Create chat_typing_indicators table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chat_typing_indicators (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        user_id INT NOT NULL,
        is_typing BOOLEAN DEFAULT TRUE,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_conversation (conversation_id, user_id),
        INDEX idx_conversation_typing (conversation_id, is_typing)
      ) CHARACTER SET utf8 COLLATE utf8_unicode_ci
    `);
    console.log('✅ Created chat_typing_indicators table');
    
    console.log('✅ HR chat schema update completed!');
    
  } catch (error) {
    console.error('❌ Error updating HR chat schema:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
    process.exit(0);
  }
}

fixHRChatSchema();