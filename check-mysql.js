import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkMySQL() {
  console.log('Checking MySQL connection...');
  console.log('Host:', process.env.DB_HOST || 'localhost');
  console.log('User:', process.env.DB_USER || 'root');
  console.log('Database:', process.env.DB_DATABASE || 'onboarding_db');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 10000
    });
    
    console.log('✅ MySQL server connection successful');
    
    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [process.env.DB_DATABASE || 'onboarding_db']);
    
    if (databases.length === 0) {
      console.log('❌ Database does not exist. Creating...');
      await connection.execute('CREATE DATABASE ??', [process.env.DB_DATABASE || 'onboarding_db']);
      console.log('✅ Database created');
    } else {
      console.log('✅ Database exists');
    }
    
    await connection.end();
    console.log('✅ MySQL check completed successfully');
    
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.log('\n💡 Solutions:');
    console.log('1. Start MySQL service: net start mysql (Windows) or sudo service mysql start (Linux)');
    console.log('2. Check MySQL is running on port 3306');
    console.log('3. Verify credentials in .env file');
    console.log('4. Try connecting with empty password if using default MySQL setup');
    process.exit(1);
  }
}

checkMySQL();