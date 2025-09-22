import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateTrainingTypes() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'onboarding_portal'
        });

        console.log('Connected to database');

        // Update training_modules type enum to include DOC
        try {
            await connection.execute(`
                ALTER TABLE training_modules 
                MODIFY COLUMN type ENUM('Video', 'PDF', 'DOC', 'Quiz') NOT NULL
            `);
            console.log('Updated training_modules type enum to include DOC');
        } catch (error) {
            console.error('Error updating type enum:', error.message);
        }

        console.log('Training types updated successfully!');

    } catch (error) {
        console.error('Database error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateTrainingTypes();