import 'dotenv/config';
import { query } from '../src/lib/db.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO User (id, email, username, password, name, role, isEmailVerified, createdAt, updatedAt) 
     VALUES (?, 'admin@lumpat.com', 'admin', ?, 'Admin Utama', 'admin', true, NOW(), NOW())`,
    [id, hash]
  );
  console.log('✅ Akun admin berhasil dibuat!');
  console.log('Email: admin@lumpat.com');
  console.log('Password: admin123');
  process.exit(0);
}

main().catch(console.error);
