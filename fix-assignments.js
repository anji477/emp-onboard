// Fix assignments table issue
import db from './db-mysql.js';

async function fixAssignmentsTable() {
  try {
    console.log('Creating user_assignments table if it doesn\'t exist...');
    
    // Create user_assignments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_type ENUM('task', 'policy', 'document', 'training') NOT NULL,
        item_id INT NOT NULL,
        assigned_by INT NOT NULL,
        assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date DATE,
        is_required BOOLEAN DEFAULT TRUE,
        is_common BOOLEAN DEFAULT FALSE,
        status ENUM('assigned', 'in_progress', 'completed', 'overdue') DEFAULT 'assigned',
        completed_date TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_item (user_id, item_type),
        INDEX idx_common (is_common)
      )
    `);
    
    console.log('✅ user_assignments table created successfully');
    
    // Test the table
    const [result] = await db.execute('SELECT COUNT(*) as count FROM user_assignments');
    console.log(`📊 Current assignments count: ${result[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing assignments table:', error);
    process.exit(1);
  }
}

fixAssignmentsTable();