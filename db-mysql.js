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
    invitation_expires DATETIME,
    reset_token VARCHAR(255),
    reset_expires DATETIME
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role ENUM('Employee', 'Admin', 'HR') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    due_date DATE,
    status VARCHAR(50) DEFAULT 'ToDo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS training_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('Video', 'PDF', 'DOC', 'Quiz') NOT NULL,
    duration VARCHAR(50),
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS user_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_type ENUM('task', 'policy', 'training', 'document') NOT NULL,
    item_id INT NOT NULL,
    assigned_by INT,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    status ENUM('pending', 'completed', 'overdue') DEFAULT 'pending',
    completed_date TIMESTAMP NULL,
    is_required BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS user_training_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_module (user_id, module_id)
  )
`);

// Add missing columns to existing user_documents table
try {
  await pool.execute('ALTER TABLE user_documents ADD COLUMN priority ENUM(\'Low\', \'Medium\', \'High\', \'Critical\') DEFAULT \'Medium\'');
} catch (e) { /* Column already exists */ }

try {
  await pool.execute('ALTER TABLE user_documents ADD COLUMN due_date DATE');
} catch (e) { /* Column already exists */ }

try {
  await pool.execute('ALTER TABLE user_documents ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
} catch (e) { /* Column already exists */ }

try {
  await pool.execute('ALTER TABLE user_documents MODIFY status ENUM(\'Pending\', \'Uploaded\', \'InReview\', \'Verified\', \'Rejected\', \'Overdue\', \'Expired\') DEFAULT \'Pending\'');
} catch (e) { /* Already modified */ }

await pool.execute(`
  CREATE TABLE IF NOT EXISTS user_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Uploaded', 'InReview', 'Verified', 'Rejected', 'Overdue', 'Expired') DEFAULT 'Pending',
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INT,
    file_type VARCHAR(100),
    uploaded_at TIMESTAMP NULL,
    action_date DATE,
    due_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date)
  )
`);

await pool.execute(`
  CREATE TABLE IF NOT EXISTS document_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    due_in_days INT,
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
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
  CREATE TABLE IF NOT EXISTS policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    summary TEXT,
    content TEXT,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size INT,
    version VARCHAR(50) DEFAULT '1.0',
    effective_date DATE,
    sort_order INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Update organization_settings table to include documents category
try {
  await pool.execute('ALTER TABLE organization_settings MODIFY category ENUM(\'company\', \'security\', \'notifications\', \'policies\', \'documents\') NOT NULL');
} catch (e) { /* Already modified */ }

await pool.execute(`
  CREATE TABLE IF NOT EXISTS organization_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSON NOT NULL,
    category ENUM('company', 'security', 'notifications', 'policies', 'documents') NOT NULL,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
  )
`);

// Insert default settings if table is empty
try {
  const [settingsCount] = await pool.execute('SELECT COUNT(*) as count FROM organization_settings');
  if (settingsCount[0].count === 0) {
    await pool.execute(`
      INSERT INTO organization_settings (setting_key, setting_value, category, description) VALUES
      ('company_info', '{"name": "Your Company", "logo": "", "primaryColor": "#6366f1", "secondaryColor": "#f3f4f6", "darkMode": false}', 'company', 'Company branding and identity'),
      ('working_hours', '{"startTime": "09:00", "endTime": "17:00", "timezone": "UTC", "workingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]}', 'policies', 'Default working hours'),
      ('password_policy', '{"minLength": 8, "requireUppercase": true, "requireNumbers": true, "expiryDays": 90}', 'security', 'Password requirements'),
      ('notification_preferences', '{"email": {"enabled": true, "onboarding": true, "taskReminders": true}, "sms": {"enabled": false}}', 'notifications', 'Notification settings'),
      ('document_settings', '{"autoReminders": true, "reminderDays": [7, 3, 1], "maxFileSize": 10485760, "allowedTypes": ["pdf", "doc", "docx", "jpg", "png"]}', 'documents', 'Document management settings')
    `);
  }
} catch (e) {
  console.log('Settings insertion skipped:', e.message);
}

// Insert default document templates if table is empty
try {
  const [templateCount] = await pool.execute('SELECT COUNT(*) as count FROM document_templates');
  if (templateCount[0].count === 0) {
    await pool.execute(`
      INSERT INTO document_templates (name, description, category, priority, due_in_days, created_by) VALUES
      ('ID Card Copy', 'Government issued photo identification', 'Identity', 'High', 7, 1),
      ('Resume/CV', 'Current resume or curriculum vitae', 'Professional', 'Medium', 14, 1),
      ('Tax Forms (W-4)', 'Federal tax withholding forms', 'Tax', 'Critical', 3, 1),
      ('Emergency Contact Form', 'Emergency contact information', 'Personal', 'High', 7, 1),
      ('Bank Details', 'Direct deposit authorization form', 'Financial', 'High', 7, 1),
      ('Background Check Authorization', 'Authorization for background verification', 'Legal', 'Critical', 5, 1),
      ('Signed Offer Letter', 'Signed employment offer letter', 'Legal', 'Critical', 3, 1),
      ('I-9 Form', 'Employment eligibility verification', 'Legal', 'Critical', 3, 1)
    `);
  }
} catch (e) {
  console.log('Template insertion skipped:', e.message);
}

// Tables created successfully

export default pool;