import { query } from './src/lib/db.js';
async function run() {
  const records = await query(`SELECT time FROM RunnerRecord LIMIT 1`);
  console.log(records);
  process.exit(0);
}
run();
