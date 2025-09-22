// Fix upload issues - Add missing columns and test upload functionality
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function fixUploadIssues() {
    let connection;
    
    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'onboarding_portal'
        });

        console.log('Connected to database');

        // Add missing columns to users table if they don't exist
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN invitation_token VARCHAR(255) NULL,
                ADD COLUMN invitation_expires DATETIME NULL
            `);
            console.log('Added invitation columns to users table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('Invitation columns already exist');
            } else {
                console.error('Error adding invitation columns:', error.message);
            }
        }

        // Check if user_documents table exists and has correct structure
        const [tables] = await connection.execute(`
            SHOW TABLES LIKE 'user_documents'
        `);

        if (tables.length === 0) {
            console.log('Creating user_documents table...');
            await connection.execute(`
                CREATE TABLE user_documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    status ENUM('Pending', 'Uploaded', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
                    action_date DATE,
                    rejection_reason TEXT,
                    file_url VARCHAR(255),
                    file_name VARCHAR(255),
                    file_size INT,
                    file_type VARCHAR(100),
                    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            `);
            console.log('Created user_documents table');
        } else {
            console.log('user_documents table exists');
        }

        // Check table structure
        const [columns] = await connection.execute(`
            DESCRIBE user_documents
        `);
        console.log('user_documents table structure:');
        columns.forEach(col => {
            console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Test database connection with a simple query
        const [users] = await connection.execute('SELECT id, name, email FROM users LIMIT 3');
        console.log('Sample users:', users);

        console.log('Database setup completed successfully!');

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

fixUploadIssues();