import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function setupDatabase() {
  let connection;
  
  try {
    // First connect without specifying database to create it if needed
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    
    console.log('Connected to MySQL server');
    
    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE || 'onboarding_portal'}`);
    console.log('Database created/verified');
    
    // Switch to the database
    await connection.execute(`USE ${process.env.DB_DATABASE || 'onboarding_portal'}`);
    
    // Read and execute the SQL schema
    const sqlContent = fs.readFileSync('./ai_studio_code.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
        } catch (error) {
          // Ignore errors for DROP statements and duplicate entries
          if (!error.message.includes('Unknown table') && 
              !error.message.includes('Duplicate entry')) {
            console.log('Statement error (continuing):', error.message);
          }
        }
      }
    }
    
    console.log('Database schema setup completed');
    
    // Test the connection
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log('Users table has', rows[0].count, 'records');
    
  } catch (error) {
    console.error('Database setup error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();