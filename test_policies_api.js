import db from './db-mysql.js';

async function testPoliciesAPI() {
  try {
    console.log('Testing policies API logic...');
    
    // Simulate the API call
    const [policies] = await db.execute('SELECT * FROM policies ORDER BY id ASC');
    console.log('API would return:', policies.length, 'policies');
    console.log('First policy:', policies[0]);
    
  } catch (error) {
    console.error('API test error:', error);
  } finally {
    process.exit(0);
  }
}

testPoliciesAPI();