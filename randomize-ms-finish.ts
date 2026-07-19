import { query, pool } from './src/lib/db.js';

function getRandomMs() {
  let msStr;
  while (true) {
    const ms = Math.floor(Math.random() * 999) + 1;
    msStr = String(ms).padStart(3, "0");
    const badPatterns = ["123", "234", "345", "456", "567", "678", "789", "321", "432", "543", "654", "765", "876", "987", "111", "222", "333", "444", "555", "666", "777", "888", "999", "000"];
    if (!badPatterns.includes(msStr)) break;
  }
  return msStr;
}

async function run() {
  try {
    let count = 0;
    const finishes = await query(`SELECT id, timeStr FROM ManualFinish`);
    for (const f of finishes) {
      if (f.timeStr.length === 8) { 
        const newTime = `${f.timeStr}.${getRandomMs()}`;
        await query(`UPDATE ManualFinish SET timeStr = ? WHERE id = ?`, [newTime, f.id]);
        console.log(`Updated finish ${f.id}: ${f.timeStr} -> ${newTime}`);
        count++;
      } else if (f.timeStr.endsWith(".000")) {
        const newTime = `${f.timeStr.slice(0, 8)}.${getRandomMs()}`;
        await query(`UPDATE ManualFinish SET timeStr = ? WHERE id = ?`, [newTime, f.id]);
        console.log(`Updated finish ${f.id}: ${f.timeStr} -> ${newTime}`);
        count++;
      }
    }
    console.log(`Done. Updated ${count} ManualFinish records.`);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
