import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixDocumentsTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'onboarding_portal'
    });
    
    console.log('Connected to MySQL');
    
    // Add missing columns to user_documents table
    await connection.execute(`
      ALTER TABLE user_documents 
      ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS file_size INT,
      ADD COLUMN IF NOT EXISTS file_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP
    `);
    
    console.log('Added missing columns to user_documents table');
    
    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixDocumentsTable();