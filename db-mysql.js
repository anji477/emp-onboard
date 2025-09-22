// db-mysql.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('✅ MySQL pool created successfully');
} catch (error) {
  console.error('❌ MySQL connection failed:', error.message);
  console.log('📝 Please start MySQL server and create the database');
  process.exit(1);
}

// Create tables if they don't exist
await pool.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role ENUM('Employee', 'Admin', 'HR') DEFAULT 'Employee',
    avatar_url TEXT,
    team VARCHAR(255),
    job_title VARCHAR(255),
    start_date DATE,
    onboarding_progress INT DEFAULT 0,
    invitation_token VARCHAR(255),
    invitation_expires DATETIME
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ToDo',
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

await pool.execute(`
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

await pool.execute(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS organization_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSON NOT NULL,
    category ENUM('company', 'security', 'notifications', 'policies') NOT NULL,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Insert default settings if table is empty
const [settingsCount] = await pool.execute('SELECT COUNT(*) as count FROM organization_settings');
if (settingsCount[0].count === 0) {
  await pool.execute(`
    INSERT INTO organization_settings (setting_key, setting_value, category, description) VALUES
    ('company_info', '{"name": "Your Company", "logo": "", "primaryColor": "#6366f1", "secondaryColor": "#f3f4f6", "darkMode": false}', 'company', 'Company branding and identity'),
    ('working_hours', '{"startTime": "09:00", "endTime": "17:00", "timezone": "UTC", "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}', 'policies', 'Default working hours'),
    ('password_policy', '{"minLength": 8, "requireUppercase": true, "requireNumbers": true, "expiryDays": 90}', 'security', 'Password requirements'),
    ('notification_preferences', '{"email": {"enabled": true, "onboarding": true, "taskReminders": true}, "sms": {"enabled": false}}', 'notifications', 'Notification settings')
  `);
}

// Tables created successfully - no sample data inserted

export default pool;