import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateTrainingTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'onboarding_portal'
        });

        console.log('Connected to database');

        // Add file_url column to training_modules table
        try {
            await connection.execute(`
                ALTER TABLE training_modules 
                ADD COLUMN file_url VARCHAR(255) NULL
            `);
            console.log('Added file_url column to training_modules table');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('file_url column already exists');
            } else {
                console.error('Error adding file_url column:', error.message);
            }
        }

        console.log('Training table updated successfully!');

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateTrainingTable();