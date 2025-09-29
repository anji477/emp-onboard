// test-chat-api.js
import fetch from 'node-fetch';

async function testChatAPI() {
  try {
    console.log('Testing chat API...');
    
    // Test conversation creation
    const response = await fetch('http://localhost:3001/api/chat/conversation', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': 'token=test' // Mock auth
      },
      body: JSON.stringify({ channelType: 'ai' })
    });
    
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testChatAPI();