/**
 * push-cp.ts - Live Timing Test Script
 * Jalankan: npx tsx push-cp.ts
 *
 * Commands:
 *   1.1     → Runner 1 (Budi) ke CP 1 (Water CP)
 *   all.1   → Semua runner ke CP 1
 *   fin.1   → Runner 1 FINISH (update race time)
 *   fin.all → Semua runner FINISH
 *   q       → Keluar
 */

import * as readline from 'readline';

const EVENT_ID = '2d913990-5b89-4f7c-8f09-454169634ab2';
const API_BASE = 'http://localhost:3069';

const RUNNERS = [
  { bib: '001', epc: 'RFID_001', name: 'Budi Santoso' },
  { bib: '002', epc: 'RFID_002', name: 'Siti Rahayu' },
  { bib: '003', epc: 'RFID_003', name: 'Agus Pratama' },
  { bib: '004', epc: 'RFID_004', name: 'Dewi Sari' },
  { bib: '005', epc: 'RFID_005', name: 'Rizky Firmansah' },
  { bib: '006', epc: 'RFID_006', name: 'Rina Melati' },
  { bib: '007', epc: 'RFID_007', name: 'Doni Kusuma' },
  { bib: '008', epc: 'RFID_008', name: 'Anisa Putri' },
];

const CHECKPOINTS = [
  { identitas: 'SENSOR_1', name: 'Water CP' },
  { identitas: 'SENSOR_2', name: 'Checkpoint 2' },
  { identitas: 'SENSOR_3', name: 'Refueling CP' },
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>(r => rl.question(q, r));

function nowTimeStr() {
  const n = new Date();
  return [n.getHours(), n.getMinutes(), n.getSeconds()]
    .map(v => String(v).padStart(2, '0')).join(':') +
    '.' + String(n.getMilliseconds()).padStart(3, '0');
}

async function pushCp(epc: string, sensorId: string) {
  const t = nowTimeStr();
  const res = await fetch(`${API_BASE}/api/sensor-record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ i: sensorId, e: epc, t }),
  });
  const runner = RUNNERS.find(r => r.epc === epc);
  const cp = CHECKPOINTS.find(c => c.identitas === sensorId);
  if (res.ok) {
    console.log(`✅ ${runner?.name} → ${cp?.name} @ ${t}`);
  } else {
    const d = await res.json() as any;
    console.error(`❌ Failed:`, d.error || d);
  }
}

// Track start and finish times agar csv bisa di-accumulate
const startTimes: Record<string, string> = {};
const finishTimes: Record<string, string> = {};

async function pushStart(epc: string) {
  const t = nowTimeStr();
  startTimes[epc] = t;

  const csv = ['epc,times', ...Object.entries(startTimes).map(([e, t]) => `${e},${t}`)].join('\n');
  const res = await fetch(`${API_BASE}/api/csv-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'start', eventId: EVENT_ID, content: csv, filename: 'start.csv', rows: Object.keys(startTimes).length }),
  });
  const runner = RUNNERS.find(r => r.epc === epc);
  if (res.ok) {
    console.log(`🟢 START recorded: ${runner?.name} @ ${t}`);
  } else {
    const d = await res.json() as any;
    console.error(`❌ Start failed:`, d.error || d);
  }
}

async function pushFinish(epc: string) {
  const t = nowTimeStr();
  finishTimes[epc] = t;

  const csv = ['epc,times', ...Object.entries(finishTimes).map(([e, t]) => `${e},${t}`)].join('\n');
  const res = await fetch(`${API_BASE}/api/csv-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'finish', eventId: EVENT_ID, content: csv, filename: 'finish.csv', rows: Object.keys(finishTimes).length }),
  });
  const runner = RUNNERS.find(r => r.epc === epc);
  if (res.ok) {
    console.log(`🏁 FINISH recorded: ${runner?.name} @ ${t}`);
  } else {
    const d = await res.json() as any;
    console.error(`❌ Finish failed:`, d.error || d);
  }
}

function menu() {
  console.log(`
╔══════════════════════════════════════╗
║     LIVE TIMING TEST  -  PUSH CP     ║
╚══════════════════════════════════════╝

RUNNERS:
  [1] Budi Santoso   [2] Siti Rahayu    [3] Agus Pratama  [4] Dewi Sari
  [5] Rizky Firmansah [6] Rina Melati   [7] Doni Kusuma   [8] Anisa Putri

CHECKPOINTS:   [1] Water CP   [2] Checkpoint 2   [3] Refueling CP

COMMANDS:
  start.1  → Set START Time Budi
  start.all→ Set START Time Semua (WAJIB DILAKUKAN DULU BIAR WAKTU GAK NEGATIF/NO START TIME)
  1.1      → Budi ke Water CP
  all.1    → Semua runner ke Water CP
  fin.1    → Budi FINISH (update Race Time di leaderboard)
  fin.all  → Semua FINISH
  menu/?   → Tampilkan menu ini
  q        → Keluar
`);
}

async function main() {
  menu();
  while (true) {
    const input = (await ask('> ')).trim().toLowerCase();
    if (input === 'q' || input === 'quit') { rl.close(); process.exit(0); }
    if (input === 'menu' || input === '?') { menu(); continue; }

    const [a, b] = input.split('.');
    if (!a || !b) { console.log('⚠️  Format salah. Contoh: start.all / 1.1 / fin.1'); continue; }

    if (a === 'start') {
      if (b === 'all') {
        for (const r of RUNNERS) { await pushStart(r.epc); await new Promise(x => setTimeout(x, 100)); }
      } else {
        const i = parseInt(b) - 1;
        if (i < 0 || i >= RUNNERS.length || isNaN(i)) { console.log(`⚠️  Runner 1-${RUNNERS.length}`); continue; }
        await pushStart(RUNNERS[i].epc);
      }
      continue;
    }

    if (a === 'fin') {
      if (b === 'all') {
        for (const r of RUNNERS) { await pushFinish(r.epc); await new Promise(x => setTimeout(x, 100)); }
      } else {
        const i = parseInt(b) - 1;
        if (i < 0 || i >= RUNNERS.length || isNaN(i)) { console.log(`⚠️  Runner 1-${RUNNERS.length}`); continue; }
        await pushFinish(RUNNERS[i].epc);
      }
      continue;
    }

    const cpIdx = parseInt(b) - 1;
    if (isNaN(cpIdx) || cpIdx < 0 || cpIdx >= CHECKPOINTS.length) { console.log(`⚠️  CP 1-${CHECKPOINTS.length}`); continue; }

    if (a === 'all') {
      for (const r of RUNNERS) { await pushCp(r.epc, CHECKPOINTS[cpIdx].identitas); await new Promise(x => setTimeout(x, 100)); }
    } else {
      const ri = parseInt(a) - 1;
      if (isNaN(ri) || ri < 0 || ri >= RUNNERS.length) { console.log(`⚠️  Runner 1-${RUNNERS.length}`); continue; }
      await pushCp(RUNNERS[ri].epc, CHECKPOINTS[cpIdx].identitas);
    }
  }
}

main().catch(e => { console.error(e.message); rl.close(); process.exit(1); });
