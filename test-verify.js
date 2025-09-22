import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testVerify() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'onboarding_portal'
        });

        console.log('Connected to database');

        // Check current documents
        const [docs] = await connection.execute('SELECT * FROM user_documents WHERE user_id = 6');
        console.log('Current documents:', docs);

        // Test update
        if (docs.length > 0) {
            const docId = docs[0].id;
            console.log('Testing update on document ID:', docId);
            
            const [result] = await connection.execute(
                'UPDATE user_documents SET status = ?, action_date = CURDATE() WHERE id = ?',
                ['Verified', docId]
            );
            console.log('Update result:', result);

            // Check if update worked
            const [updatedDocs] = await connection.execute('SELECT * FROM user_documents WHERE id = ?', [docId]);
            console.log('After update:', updatedDocs[0]);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testVerify();