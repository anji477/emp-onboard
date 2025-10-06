// db-mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'onboarding_db',
  timezone: '+00:00',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log('✅ MySQL pool created successfully');

// Database initialization will be handled by /api/init-db endpoint

// Connection event handlers
pool.on('connection', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
    console.error('❌ Database error:', err.message);
  }
});

export default pool;