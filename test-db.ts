import { query } from './src/lib/db';
async function run() {
  const events = await query('SELECT slug, id FROM Event');
  console.log('Events:', events);
  process.exit(0);
}
run();
