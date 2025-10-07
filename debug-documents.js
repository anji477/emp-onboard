// debug-documents.js
import db from './db-mysql.js';

async function debugDocuments() {
  try {
    console.log('=== DEBUGGING DOCUMENTS ISSUE ===');
    
    // Check users table
    console.log('\n1. Users in database:');
    const [users] = await db.execute('SELECT id, name, email FROM users LIMIT 5');
    users.forEach(user => console.log(`  User ${user.id}: ${user.name} (${user.email})`));
    
    // Check user_documents table
    console.log('\n2. Documents in database:');
    const [docs] = await db.execute('SELECT id, user_id, name FROM user_documents LIMIT 5');
    docs.forEach(doc => console.log(`  Doc ${doc.id}: user_id=${doc.user_id}, name=${doc.name}`));
    
    // Check the actual JOIN
    console.log('\n3. JOIN result:');
    const [joined] = await db.execute(`
      SELECT ud.id, ud.user_id, ud.name as doc_name, u.name as user_name
      FROM user_documents ud 
      LEFT JOIN users u ON ud.user_id = u.id 
      LIMIT 5
    `);
    joined.forEach(row => console.log(`  Doc ${row.id}: user_id=${row.user_id}, user_name='${row.user_name}', doc_name='${row.doc_name}'`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

debugDocuments();