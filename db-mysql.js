// db-mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration with validation
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || 'onboarding_db',
  timezone: process.env.DB_TIMEZONE || '+00:00',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0
};

// Validate required configuration
if (!dbConfig.password) {
  throw new Error('DB_PASSWORD environment variable is required');
}

const pool = mysql.createPool(dbConfig);

console.log('✅ MySQL pool created successfully');

// Database initialization will be handled by /api/init-db endpoint

// Connection event handlers
pool.on('connection', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database error:', {
    code: err.code,
    message: err.message,
    host: dbConfig.host,
    database: dbConfig.database
  });
});

export default pool;