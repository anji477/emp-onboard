import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('Testing MySQL connection...');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('User:', process.env.DB_USER || 'root');
    console.log('Password provided:', process.env.DB_PASSWORD ? 'YES' : 'NO');
    
    // First try without database
    console.log('\n1. Testing connection without database...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('✅ MySQL server connection successful!');
    
    // Check if database exists
    console.log('\n2. Checking if database exists...');
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [process.env.DB_DATABASE || 'onboarding_portal']);
    
    if (databases.length === 0) {
      console.log('❌ Database does not exist. Creating it...');
      await connection.execute(`CREATE DATABASE ${process.env.DB_DATABASE || 'onboarding_portal'}`);
      console.log('✅ Database created successfully!');
    } else {
      console.log('✅ Database exists!');
    }
    
    // Switch to database
    await connection.execute(`USE ${process.env.DB_DATABASE || 'onboarding_portal'}`);
    
    // Check if users table exists
    console.log('\n3. Checking tables...');
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    
    if (tables.length === 0) {
      console.log('❌ Users table does not exist');
    } else {
      console.log('✅ Users table exists!');
      const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log('Users count:', rows[0].count);
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 Suggestions:');
      console.log('1. Check if MySQL is running');
      console.log('2. Verify the password in .env file');
      console.log('3. Try connecting with empty password');
      console.log('4. Check MySQL user permissions');
    }
  }
}

// Also test with empty password
async function testWithEmptyPassword() {
  try {
    console.log('\n\n=== Testing with empty password ===');
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });
    
    console.log('✅ Connected with empty password!');
    await connection.end();
    return true;
  } catch (error) {
    console.log('❌ Empty password failed:', error.message);
    return false;
  }
}

testConnection().then(() => {
  return testWithEmptyPassword();
});