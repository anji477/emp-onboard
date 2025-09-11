// db-mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

// Create tables if they don't exist
await connection.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Employee',
    avatar_url TEXT,
    team VARCHAR(255),
    job_title VARCHAR(255),
    start_date DATE,
    onboarding_progress INT DEFAULT 0,
    invitation_token VARCHAR(255),
    invitation_expires DATETIME
  )
`);

await connection.execute(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ToDo',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

await connection.execute(`
  CREATE TABLE IF NOT EXISTS it_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    serial_number VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Unassigned',
    purchase_date DATE,
    warranty_info TEXT,
    license_expiry DATE,
    location VARCHAR(255),
    assigned_to_id INT,
    assigned_date DATE,
    FOREIGN KEY (assigned_to_id) REFERENCES users(id)
  )
`);

await connection.execute(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Tables created successfully - no sample data inserted

export default connection;