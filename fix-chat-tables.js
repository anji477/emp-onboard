// fix-chat-tables.js
import db from './db-mysql.js';

async function createChatTables() {
  try {
    console.log('Creating chat tables...');

    // Create chat_conversations table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel_type ENUM('ai', 'hr', 'admin', 'support') DEFAULT 'ai',
        title VARCHAR(255),
        status ENUM('active', 'closed', 'archived') DEFAULT 'active',
        assigned_hr_id INT NULL,
        last_hr_read TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_hr_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_channel (user_id, channel_type),
        INDEX idx_status (status)
      )
    `);

    // Create chat_messages table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL,
        sender_type ENUM('user', 'ai', 'hr', 'admin') NOT NULL,
        sender_id INT NULL,
        message_text TEXT NOT NULL,
        message_type ENUM('text', 'file', 'image') DEFAULT 'text',
        message_status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        read_by INT NULL,
        metadata JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (read_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_conversation (conversation_id),
        INDEX idx_timestamp (timestamp)
      )
    `);

    // Create chat_notifications table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        conversation_id INT NOT NULL,
        message_id INT NOT NULL,
        notification_type ENUM('new_message', 'hr_assigned', 'conversation_closed') DEFAULT 'new_message',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
        INDEX idx_user_unread (user_id, is_read)
      )
    `);

    // Create chat_settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS chat_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        ai_enabled BOOLEAN DEFAULT TRUE,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        preferred_channel ENUM('ai', 'hr', 'admin', 'support') DEFAULT 'ai',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Chat tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating chat tables:', error);
    process.exit(1);
  }
}

createChatTables();