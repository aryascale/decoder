import mysql from 'mysql2/promise';
import 'dotenv/config';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL!;
const regex = /^mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;
const match = dbUrl.match(regex);
const [, user, password, host, portStr, database] = match!;

const pool = mysql.createPool({
  host,
  port: parseInt(portStr || '3306'),
  user,
  password,
  database,
});

async function main() {
  const email = 'checkpoint@lumpat.com';
  const plainPassword = 'checkpoint123';
  const username = 'checkpoint_user';

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [rows]: any = await pool.execute('SELECT id FROM User WHERE email = ?', [email]);
    
    if (rows && rows.length > 0) {
      console.log('Checkpoint user already exists. Updating password...');
      await pool.execute('UPDATE User SET password = ?, role = ? WHERE email = ?', [hashedPassword, 'checkpoint', email]);
      console.log('Checkpoint user updated.');
    } else {
      const id = crypto.randomUUID();
      await pool.execute(
        'INSERT INTO User (id, email, username, password, role, isEmailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, email, username, hashedPassword, 'checkpoint', true]
      );
      console.log('Checkpoint user created successfully!');
    }
  } catch (error) {
    console.error('Error creating checkpoint user:', error);
  } finally {
    await pool.end();
  }
}

main();
