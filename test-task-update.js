import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testTaskUpdate() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'onboarding_portal'
    });
    
    console.log('✅ Connected to MySQL');
    
    // Check current tasks
    const [tasks] = await connection.execute('SELECT * FROM tasks WHERE user_id = 6');
    console.log('Current tasks:', tasks);
    
    // Test update
    await connection.execute('UPDATE tasks SET status = ? WHERE id = ?', ['Completed', 1]);
    console.log('✅ Task updated');
    
    // Check updated tasks
    const [updatedTasks] = await connection.execute('SELECT * FROM tasks WHERE user_id = 6');
    console.log('Updated tasks:', updatedTasks);
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTaskUpdate();