import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDocs() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'onboarding_portal'
        });

        // Get all documents for user 6
        const [docs] = await connection.execute('SELECT * FROM user_documents WHERE user_id = 6 ORDER BY id');
        console.log('All documents for user 6:');
        docs.forEach(doc => {
            console.log(`ID: ${doc.id}, Name: ${doc.name}, Status: ${doc.status}, Action Date: ${doc.action_date}`);
        });

        // Create a test uploaded document if none exist
        const uploadedDocs = docs.filter(doc => doc.status === 'Uploaded');
        if (uploadedDocs.length === 0) {
            console.log('\nNo uploaded documents found. Creating one...');
            await connection.execute(
                'INSERT INTO user_documents (user_id, name, status, file_url, uploaded_at) VALUES (?, ?, ?, ?, NOW())',
                [6, 'Test Document', 'Uploaded', '/uploads/test.pdf']
            );
            console.log('Created test uploaded document');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDocs();