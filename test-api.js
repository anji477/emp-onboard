// test-api.js
import fetch from 'node-fetch';

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3001/api/documents/all', {
      headers: {
        'Cookie': 'token=your-token-here'
      }
    });
    const data = await response.json();
    console.log('API Response:', JSON.stringify(data[0], null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();