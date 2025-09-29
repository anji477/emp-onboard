// test-chat.js
import db from './db-mysql.js';

async function testChatSystem() {
  try {
    console.log('🧪 Testing chat system...');

    // Check if chat tables exist
    const [conversations] = await db.execute('SELECT COUNT(*) as count FROM chat_conversations');
    console.log('✅ Chat conversations table exists, count:', conversations[0].count);

    const [messages] = await db.execute('SELECT COUNT(*) as count FROM chat_messages');
    console.log('✅ Chat messages table exists, count:', messages[0].count);

    const [notifications] = await db.execute('SELECT COUNT(*) as count FROM chat_notifications');
    console.log('✅ Chat notifications table exists, count:', notifications[0].count);

    // Check users table
    const [users] = await db.execute('SELECT id, name, email, role FROM users LIMIT 5');
    console.log('✅ Users found:', users.length);
    users.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Test conversation creation
    if (users.length > 0) {
      const testUserId = users[0].id;
      console.log(`\n🧪 Testing conversation creation for user ${testUserId}...`);

      // Create HR conversation
      const [result] = await db.execute(
        'INSERT INTO chat_conversations (user_id, channel_type, title) VALUES (?, ?, ?)',
        [testUserId, 'hr', 'Test HR Chat']
      );
      const conversationId = result.insertId;
      console.log('✅ HR conversation created:', conversationId);

      // Add test message
      await db.execute(
        'INSERT INTO chat_messages (conversation_id, sender_type, sender_id, message_text) VALUES (?, ?, ?, ?)',
        [conversationId, 'user', testUserId, 'Hello HR team, I need help!']
      );
      console.log('✅ Test message added');

      // Check HR conversations query
      const [hrConversations] = await db.execute(`
        SELECT cc.*, u.name as user_name, u.email as user_email,
               (SELECT message_text FROM chat_messages WHERE conversation_id = cc.id ORDER BY timestamp DESC LIMIT 1) as last_message,
               (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = cc.id) as total_messages
        FROM chat_conversations cc
        JOIN users u ON cc.user_id = u.id
        WHERE cc.status = 'active' AND (
          cc.channel_type IN ('hr', 'admin', 'support') OR 
          EXISTS (SELECT 1 FROM chat_messages WHERE conversation_id = cc.id AND sender_type = 'user')
        )
        ORDER BY cc.updated_at DESC
      `);
      
      console.log('✅ HR conversations query result:', hrConversations.length);
      hrConversations.forEach(conv => {
        console.log(`  - ${conv.user_name}: "${conv.last_message}" (${conv.total_messages} messages)`);
      });

      // Clean up test data
      await db.execute('DELETE FROM chat_messages WHERE conversation_id = ?', [conversationId]);
      await db.execute('DELETE FROM chat_conversations WHERE id = ?', [conversationId]);
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 Chat system test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Chat system test failed:', error);
    process.exit(1);
  }
}

testChatSystem();