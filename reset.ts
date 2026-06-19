import { query } from './src/lib/db.ts';

const EVENT_ID = '2d913990-5b89-4f7c-8f09-454169634ab2';
const API_BASE = 'http://localhost:3069';

async function resetRace() {
  console.log('🔄 Mereset balapan...');

  // 1. Hapus semua record CP
  await query('DELETE FROM RunnerRecord WHERE eventId = ?', [EVENT_ID]);
  console.log('✅ RunnerRecord dihapus (Checkpoint kosong)');

  // 2. Kosongkan Finish CSV
  await fetch(`${API_BASE}/api/csv-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'finish', eventId: EVENT_ID, content: 'epc,times\n', filename: 'finish.csv', rows: 0 }),
  });
  console.log('✅ Finish time dikosongkan');

  // 3. (Opsional) Kosongkan Start CSV biar status jadi NO START TIME
  // Tapi karena lu minta statusnya ACTIVE, kita biarin Start CSV-nya 
  // Atau kita set ulang Start Time ke waktu sekarang?
  // Kita kosongkan aja dulu start csv, nanti lu bisa klik start.all di push-cp
  await fetch(`${API_BASE}/api/csv-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'start', eventId: EVENT_ID, content: 'epc,times\n', filename: 'start.csv', rows: 0 }),
  });
  console.log('✅ Start time dikosongkan (Biar bisa di-start.all ulang)');

  console.log('\n🎉 Selesai! Refresh browser.');
  console.log('👉 Di terminal push-cp.ts, ketik `start.all` untuk memulai balapan baru (status berubah jadi ACTIVE).');
}

resetRace().catch(console.error);
