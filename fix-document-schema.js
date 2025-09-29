// fix-document-schema.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
};

async function fixDocumentSchema() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database');
    
    // Check and add missing columns to company_documents table
    console.log('Checking company_documents table...');
    
    // Check if is_active column exists
    const [isActiveColumns] = await connection.execute(
      "SHOW COLUMNS FROM company_documents LIKE 'is_active'"
    );
    
    if (isActiveColumns.length === 0) {
      console.log('Adding is_active column to company_documents...');
      await connection.execute(
        'ALTER TABLE company_documents ADD COLUMN is_active BOOLEAN DEFAULT TRUE'
      );
      console.log('✓ Added is_active column');
    
    // Check if uploaded_by column exists
    const [uploadedByColumns] = await connection.execute(
      "SHOW COLUMNS FROM company_documents LIKE 'uploaded_by'"
    );
    
    if (uploadedByColumns.length === 0) {
      console.log('Adding uploaded_by column to company_documents...');
      await connection.execute(
        'ALTER TABLE company_documents ADD COLUMN uploaded_by INT'
      );
      console.log('✓ Added uploaded_by column');
    } else {
      console.log('✓ uploaded_by column already exists');
    }
    } else {
      console.log('✓ is_active column already exists');
    }
    
    // Check and add missing columns to user_documents table
    console.log('Checking user_documents table...');
    
    // Check if category column exists
    const [categoryColumns] = await connection.execute(
      "SHOW COLUMNS FROM user_documents LIKE 'category'"
    );
    
    if (categoryColumns.length === 0) {
      console.log('Adding category column to user_documents...');
      await connection.execute(
        'ALTER TABLE user_documents ADD COLUMN category VARCHAR(50) DEFAULT "General"'
      );
      console.log('✓ Added category column');
    } else {
      console.log('✓ category column already exists');
    }
    
    // Check if assigned_by column exists
    const [assignedByColumns] = await connection.execute(
      "SHOW COLUMNS FROM user_documents LIKE 'assigned_by'"
    );
    
    if (assignedByColumns.length === 0) {
      console.log('Adding assigned_by column to user_documents...');
      await connection.execute(
        'ALTER TABLE user_documents ADD COLUMN assigned_by INT'
      );
      console.log('✓ Added assigned_by column');
    } else {
      console.log('✓ assigned_by column already exists');
    }
    
    // Check if assigned_date column exists
    const [assignedDateColumns] = await connection.execute(
      "SHOW COLUMNS FROM user_documents LIKE 'assigned_date'"
    );
    
    if (assignedDateColumns.length === 0) {
      console.log('Adding assigned_date column to user_documents...');
      await connection.execute(
        'ALTER TABLE user_documents ADD COLUMN assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      );
      console.log('✓ Added assigned_date column');
    } else {
      console.log('✓ assigned_date column already exists');
    }
    
    console.log('\n🎉 Document schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing document schema:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

fixDocumentSchema();