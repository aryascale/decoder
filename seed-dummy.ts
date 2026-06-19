/**
 * seed-dummy.ts
 * Seeds 8 dummy runners untuk testing Live Timing
 * Jalankan: npx tsx seed-dummy.ts
 */

import { query } from './src/lib/db.ts';

const EVENT_ID = '2d913990-5b89-4f7c-8f09-454169634ab2';
const CATEGORY_ID = 'cat-1781370151063';
const API_BASE = 'http://localhost:3069';

const RUNNERS = [
  { bib: '001', epc: 'RFID_001', name: 'Budi Santoso',     gender: 'laki-laki' },
  { bib: '002', epc: 'RFID_002', name: 'Siti Rahayu',      gender: 'perempuan' },
  { bib: '003', epc: 'RFID_003', name: 'Agus Pratama',     gender: 'laki-laki' },
  { bib: '004', epc: 'RFID_004', name: 'Dewi Sari',        gender: 'perempuan' },
  { bib: '005', epc: 'RFID_005', name: 'Rizky Firmansah',  gender: 'laki-laki' },
  { bib: '006', epc: 'RFID_006', name: 'Rina Melati',      gender: 'perempuan' },
  { bib: '007', epc: 'RFID_007', name: 'Doni Kusuma',      gender: 'laki-laki' },
  { bib: '008', epc: 'RFID_008', name: 'Anisa Putri',      gender: 'perempuan' },
];

async function uploadCsv(kind: string, content: string) {
  const res = await fetch(`${API_BASE}/api/csv-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, eventId: EVENT_ID, content, filename: `${kind}.csv`, rows: content.split('\n').length - 1 }),
  });
  const data = await res.json() as any;
  if (res.ok) {
    console.log(`  ✅ ${kind}.csv uploaded`);
  } else {
    console.error(`  ❌ ${kind}.csv failed:`, data);
  }
}

async function run() {
  console.log('🚀 Seeding dummy runners untuk Live Timing test...\n');

  // 1. Bersihkan RunnerRecord lama
  const deleted = await query('DELETE FROM RunnerRecord WHERE eventId = ?', [EVENT_ID]) as any;
  console.log(`🗑️  Cleared ${deleted.affectedRows || 0} RunnerRecord entries`);

  // 2. Seed setiap runner ke DB
  console.log('\n👟 Seeding runners ke DB...');
  for (const r of RUNNERS) {
    const regId = `reg-dummy-${r.bib}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    await query(`
      INSERT INTO EventRegistration (id, eventId, name, bibNumber, bibName, gender, categoryId, paymentStatus, customData, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'settlement', NULL, ?)
      ON DUPLICATE KEY UPDATE name=VALUES(name), gender=VALUES(gender), paymentStatus='settlement'
    `, [regId, EVENT_ID, r.name, r.bib, r.name, r.gender, CATEGORY_ID, now]);

    await query(`
      INSERT INTO RunnerStatus (id, eventId, bib, epc, createdAt)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE epc=VALUES(epc)
    `, [`rs-dummy-${r.bib}`, EVENT_ID, r.bib, r.epc, now]);

    console.log(`  ✅ ${r.bib} | ${r.name} | ${r.epc}`);
  }

  // 3. Upload CSV files
  console.log('\n📄 Uploading CSV files...');
  
  const masterCsv = [
    'epc,bib,name,gender,category',
    ...RUNNERS.map(r => `${r.epc},${r.bib},${r.name},${r.gender},10K`)
  ].join('\n');
  await uploadCsv('master', masterCsv);

  const startCsv = [
    'epc,times',
    ...RUNNERS.map(r => `${r.epc},07:00:00.000`)
  ].join('\n');
  await uploadCsv('start', startCsv);

  // Finish CSV kosong - semua belum finish
  await uploadCsv('finish', 'epc,times');

  console.log('\n🎉 Selesai! Sekarang:');
  console.log('   1. Refresh browser ke halaman Results');
  console.log('   2. Semua 8 runner harusnya muncul sebagai ACTIVE');
  console.log('   3. Jalankan: npx tsx push-cp.ts untuk push CP satu per satu\n');

  process.exit(0);
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
