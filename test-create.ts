import { query, pool } from './src/lib/db.js';
async function run() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS ActivityLogTest (id INT)`);
    console.log('query ok');
    await pool.execute(`CREATE TABLE IF NOT EXISTS ActivityLogTest2 (id INT)`);
    console.log('execute ok');
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();
