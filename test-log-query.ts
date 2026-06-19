import { query } from './src/lib/db.js';
async function run() {
  try {
    const logs = await query('SELECT * FROM ActivityLog ORDER BY createdAt DESC LIMIT 5');
    console.log('Logs:', logs);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
run();
