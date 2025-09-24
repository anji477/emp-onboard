// Test script to verify settings API endpoint
import fetch from 'node-fetch';

const BASE_URL = 'http://192.168.1.140:5173';

async function testSettingsAPI() {
  try {
    console.log('Testing settings API endpoint...');
    
    // First, try to login as admin to get a valid token
    const loginResponse = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status, await loginResponse.text());
      return;
    }
    
    // Extract token from cookies
    const cookies = loginResponse.headers.get('set-cookie');
    const tokenMatch = cookies?.match(/token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    
    if (!token) {
      console.error('No token received from login');
      return;
    }
    
    console.log('Login successful, testing settings endpoint...');
    
    // Test settings endpoint with token
    const settingsResponse = await fetch(`${BASE_URL}/api/settings`, {
      method: 'GET',
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Settings API Response Status:', settingsResponse.status);
    
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      console.log('Settings retrieved successfully:');
      console.log(JSON.stringify(settings, null, 2));
    } else {
      const error = await settingsResponse.text();
      console.error('Settings API Error:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSettingsAPI();