import mysql from 'mysql2/promise';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL!;
// Original regex (requires password):
// const regex = /^mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;
// Modified regex (allows empty password AND omitted colon):
const regex = /^mysql:\/\/([^:@]+)(?::([^@]*))?@([^:/]+)(?::(\d+))?\/([^?]+)/;
const match = dbUrl.match(regex);

if (!match) throw new Error('Invalid DATABASE_URL');

const [, user, password, host, portStr, database] = match;

export const pool = mysql.createPool({
  host,
  port: parseInt(portStr || '3306'),
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as any[];
}
