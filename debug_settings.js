// Debug settings API issue
const fetch = require('node-fetch');

async function debug() {
  try {
    // Test without auth first
    const response = await fetch('http://192.168.1.140:5173/api/settings');
    console.log('Status:', response.status);
    console.log('Response:', await response.text());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debug();