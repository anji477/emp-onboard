import db from './db-mysql.js';

async function debugPolicies() {
  try {
    // Check database name
    const [dbName] = await db.execute('SELECT DATABASE() as db_name');
    console.log('Current database:', dbName[0].db_name);
    
    // List all tables
    const [tables] = await db.execute('SHOW TABLES');
    console.log('All tables:', tables);
    
    // Check if policies table exists in current db
    const [policiesTable] = await db.execute("SHOW TABLES LIKE 'policies'");
    console.log('Policies table exists:', policiesTable.length > 0);
    
    if (policiesTable.length > 0) {
      const [count] = await db.execute('SELECT COUNT(*) as count FROM policies');
      console.log('Policies count:', count[0].count);
      
      const [policies] = await db.execute('SELECT * FROM policies LIMIT 3');
      console.log('Sample policies:', policies);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugPolicies();