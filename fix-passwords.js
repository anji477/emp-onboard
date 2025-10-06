import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

async function fixPasswords() {
  if (!process.env.DB_PASSWORD) {
    throw new Error('DB_PASSWORD environment variable is required');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  });

  // Generate secure random passwords for each user
  const users = [
    { id: 1, password: crypto.randomBytes(16).toString('hex') },
    { id: 6, password: crypto.randomBytes(16).toString('hex') },
    { id: 7, password: crypto.randomBytes(16).toString('hex') },
    { id: 8, password: crypto.randomBytes(16).toString('hex') },
    { id: 9, password: crypto.randomBytes(16).toString('hex') }
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, user.id]
    );
    console.log(`Updated password for user ${user.id}`);
  }

  await connection.end();
  console.log('All passwords updated successfully');
}

fixPasswords().catch(err => {
  console.error('Password update failed:', err.message);
  process.exit(1);
});