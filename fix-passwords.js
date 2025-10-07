import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

async function fixPasswords() {
  const connection = await mysql.createConnection({
    host: '192.168.1.5',
    user: 'root',
    password: 'Z@nec2014',
    database: 'onboarding_db'
  });

  const users = [
    { id: 1, password: 'password123' },
    { id: 6, password: 'password123' },
    { id: 7, password: 'password123' },
    { id: 8, password: 'password123' },
    { id: 9, password: 'password123' }
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

fixPasswords().catch(console.error);