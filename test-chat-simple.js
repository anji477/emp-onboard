// test-chat-simple.js - Simple test for chat functionality
import db from './db-mysql.js';

async function testChatTables() {
  try {
    console.log('Testing chat database tables...');
    
    // Test if tables exist
    const [conversations] = await db.execute('SELECT COUNT(*) as count FROM chat_conversations');
    console.log('✅ chat_conversations table exists, rows:', conversations[0].count);
    
    const [messages] = await db.execute('SELECT COUNT(*) as count FROM chat_messages');
    console.log('✅ chat_messages table exists, rows:', messages[0].count);
    
    const [knowledge] = await db.execute('SELECT COUNT(*) as count FROM ai_knowledge_base');
    console.log('✅ ai_knowledge_base table exists, rows:', knowledge[0].count);
    
    // Test AI service
    const aiService = (await import('./services/aiService.js')).default;
    const testResponse = await aiService.processMessage(1, 'hello');
    console.log('✅ AI Service response:', testResponse);
    
    console.log('\n🎉 All chat components are working!');
    
  } catch (error) {
    console.error('❌ Chat test failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testChatTables();