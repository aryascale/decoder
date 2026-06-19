import { query } from './db';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'uploads', 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

export async function createBackup(trigger: string): Promise<string> {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_${trigger}_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Dump all critical tables
  const registrations: any = await query(
    `SELECT er.*, c.name as categoryName, e.name as eventName 
     FROM EventRegistration er 
     LEFT JOIN Category c ON er.categoryId = c.id 
     LEFT JOIN Event e ON er.eventId = e.id 
     ORDER BY er.createdAt DESC`
  );

  const categories: any = await query('SELECT * FROM Category ORDER BY eventId, `order`');
  const events: any = await query('SELECT id, name, slug FROM Event');

  const backupData = {
    createdAt: new Date().toISOString(),
    trigger,
    counts: {
      registrations: registrations.length,
      categories: categories.length,
      events: events.length,
    },
    registrations,
    categories,
    events,
  };

  fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
  console.log(`[BACKUP] Created: ${filename} (${registrations.length} registrations)`);

  // Keep only last 50 backups
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  for (const old of files.slice(2000)) {
    fs.unlinkSync(path.join(BACKUP_DIR, old));
  }

  return filename;
}

export function listBackups(): { name: string; size: number; createdAt: string; trigger: string }[] {
  ensureBackupDir();
  
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .sort()
    .reverse()
    .map(name => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      // Parse trigger from filename: backup_TRIGGER_TIMESTAMP.json
      const trigger = name.replace('backup_', '').replace(/_\d{4}-.*$/, '');
      return { name, size: stat.size, createdAt: stat.mtime.toISOString(), trigger };
    });
}

export function getBackupData(filename: string): any {
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

export async function restoreRegistrations(filename: string): Promise<{ restored: number; skipped: number }> {
  const data = getBackupData(filename);
  if (!data || !data.registrations) throw new Error('Invalid backup file');

  let restored = 0;
  let skipped = 0;

  for (const reg of data.registrations) {
    // Check if registration already exists
    const existing: any = await query('SELECT id FROM EventRegistration WHERE id = ? LIMIT 1', [reg.id]);
    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Check if event and category still exist
    const eventExists: any = await query('SELECT id FROM Event WHERE id = ? LIMIT 1', [reg.eventId]);
    const catExists: any = await query('SELECT id FROM Category WHERE id = ? LIMIT 1', [reg.categoryId]);
    
    if (eventExists.length === 0 || catExists.length === 0) {
      skipped++;
      continue;
    }

    try {
      await query(
        `INSERT INTO EventRegistration 
          (id, eventId, categoryId, email, name, phoneNumber, gender, bloodType, emergencyName, emergencyPhone, tshirtSize, bibName, notes, orderId, grossAmount, dateOfBirth, customData, paymentStatus, paymentMethod, paidAt, snapToken, snapUrl, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          reg.id, reg.eventId, reg.categoryId, reg.email, reg.name, reg.phoneNumber,
          reg.gender, reg.bloodType, reg.emergencyName, reg.emergencyPhone,
          reg.tshirtSize, reg.bibName, reg.notes, reg.orderId, reg.grossAmount,
          reg.dateOfBirth, reg.customData ? JSON.stringify(reg.customData) : null,
          reg.paymentStatus, reg.paymentMethod, reg.paidAt, reg.snapToken, reg.snapUrl,
          reg.createdAt
        ]
      );
      restored++;
    } catch (e) {
      skipped++;
    }
  }

  return { restored, skipped };
}
