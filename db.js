// db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'onboarding_portal'
});

// Helper function to convert MySQL results to expected format
const dbHelper = {
  async get(query, params = []) {
    const [rows] = await db.execute(query, params);
    return rows[0] || null;
  },
  async all(query, params = []) {
    const [rows] = await db.execute(query, params);
    return rows;
  },
  async run(query, params = []) {
    const [result] = await db.execute(query, params);
    return { lastID: result.insertId, changes: result.affectedRows };
  }
};

export default dbHelper;