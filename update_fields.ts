import { query } from './src/lib/db';
import crypto from 'crypto';

async function main() {
  const events = await query('SELECT id FROM Event') as any[];
  const defaultFields = [
    { label: 'First Name', type: 'text', required: true, options: null },
    { label: 'Last Name', type: 'text', required: true, options: null },
    { label: 'Gender', type: 'dropdown', required: true, options: 'Male, Female' },
    { label: 'Blood Type', type: 'dropdown', required: true, options: 'A, B, AB, O' },
    { label: 'Emergency Contact Name', type: 'text', required: true, options: null },
    { label: 'Emergency Contact Phone Number', type: 'tel', required: true, options: null },
    { label: 'Current Physical Address', type: 'textarea', required: true, options: null },
    { label: 'Instagram Profile URL', type: 'text', required: true, options: null },
    { label: 'Nationality', type: 'nationality', required: true, options: null },
  ];

  for (const event of events) {
    await query('DELETE FROM RegistrationField WHERE eventId = ?', [event.id]);
    for (let i = 0; i < defaultFields.length; i++) {
      await query(
        'INSERT INTO RegistrationField (id, eventId, label, type, required, options, `order`, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [crypto.randomUUID(), event.id, defaultFields[i].label, defaultFields[i].type, defaultFields[i].required, defaultFields[i].options, i]
      );
    }
    console.log(`Updated event ${event.id}`);
  }
  console.log('Done!');
  process.exit(0);
}
main().catch(console.error);
