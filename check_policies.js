import db from './db-mysql.js';

async function checkPolicies() {
  try {
    console.log('Checking policies table...');
    
    // Check if table exists
    const [tables] = await db.execute("SHOW TABLES LIKE 'policies'");
    console.log('Tables found:', tables);
    
    if (tables.length === 0) {
      console.log('Policies table does not exist');
      return;
    }
    
    // Check table structure
    const [structure] = await db.execute('DESCRIBE policies');
    console.log('Table structure:', structure);
    
    // Count policies
    const [count] = await db.execute('SELECT COUNT(*) as count FROM policies');
    console.log('Policy count:', count[0].count);
    
    // Get sample policies
    const [policies] = await db.execute('SELECT id, title, category FROM policies LIMIT 5');
    console.log('Sample policies:', policies);
    
  } catch (error) {
    console.error('Error checking policies:', error);
  } finally {
    process.exit(0);
  }
}

checkPolicies();