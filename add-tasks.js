import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addTasks() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'onboarding_portal'
    });
    
    console.log('Connected to MySQL');
    
    // Create tasks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        due_date DATE,
        status ENUM('ToDo', 'InProgress', 'Completed') NOT NULL DEFAULT 'ToDo',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Tasks table created');
    
    // Insert sample tasks
    await connection.execute(`
      INSERT IGNORE INTO tasks (user_id, title, category, due_date, status) VALUES
      (6, 'Complete profile setup', 'General', '2024-01-15', 'InProgress'),
      (6, 'Upload required documents', 'Paperwork', '2024-01-16', 'ToDo'),
      (6, 'Set up development environment', 'IT Setup', '2024-01-20', 'ToDo'),
      (6, 'Complete security training', 'Training', '2024-01-22', 'ToDo'),
      (6, 'Schedule 1-on-1 with manager', 'Meetings', '2024-01-18', 'ToDo')
    `);
    
    console.log('Tasks inserted');
    
    // Check tasks
    const [tasks] = await connection.execute('SELECT * FROM tasks');
    console.log('Tasks in database:', tasks);
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

addTasks();