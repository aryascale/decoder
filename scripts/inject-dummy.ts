import { query } from '../src/lib/db.js';

async function inject() {
  const evId = '2d913990-5b89-4f7c-8f09-454169634ab2';
  
  await query(
    `INSERT INTO Checkpoint (id, eventId, name, identitas, \`order\`, createdAt) VALUES (UUID(), ?, 'CP 1', 'CP1', 1, NOW())`,
    [evId]
  );
  
  await query(
    `INSERT INTO RunnerStatus (id, eventId, epc, bib, isDQ, isHidden, createdAt, updatedAt) VALUES (UUID(), ?, 'RFID_12345', '101', false, false, NOW(), NOW())`,
    [evId]
  );
  
  console.log('Dummy injected');
  process.exit(0);
}

inject().catch(console.error);
