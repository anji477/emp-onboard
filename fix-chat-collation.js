// fix-chat-collation.js
import db from './db-mysql.js';

async function fixChatCollation() {
  try {
    console.log('Fixing chat table collation...');

    // Fix chat_messages table collation
    await db.execute('ALTER TABLE chat_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await db.execute('ALTER TABLE chat_conversations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await db.execute('ALTER TABLE chat_notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');

    console.log('✅ Chat table collation fixed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing collation:', error);
    process.exit(1);
  }
}

fixChatCollation();