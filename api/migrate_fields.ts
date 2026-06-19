import { query } from '../src/lib/db';
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
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

    let count = 0;
    for (const event of events) {
      await query('DELETE FROM RegistrationField WHERE eventId = ? AND label = "National ID Number (Foreign participants, please enter 0)"', [event.id]);
      const existing = await query('SELECT id FROM RegistrationField WHERE eventId = ? AND label = "Nationality"', [event.id]) as any[];
      if (existing.length === 0) {
          await query(
            'INSERT INTO RegistrationField (id, eventId, label, type, required, options, `order`, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [crypto.randomUUID(), event.id, 'Nationality', 'nationality', true, null, 9]
          );
      }
      count++;
    }
    return { statusCode: 200, body: JSON.stringify({ message: `Updated ${count} events` }) };
  } catch (err) {
    return { statusCode: 500, body: String(err) };
  }
}
