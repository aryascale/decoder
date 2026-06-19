import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    if (event.httpMethod === 'GET') {
      const penalties: any = await query(
        'SELECT id, eventId, bib, epc, hours, minutes, seconds, penaltyMs, createdAt FROM Penalty WHERE eventId = ? ORDER BY createdAt DESC',
        [eventId]
      );
      return successResponse(penalties);
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { bib, epc, hours = 0, minutes = 0, seconds = 0 } = body;

      if (!bib || !epc) return errorResponse('bib and epc are required', 400);

      const h = Math.max(0, Math.floor(Number(hours) || 0));
      const m = Math.max(0, Math.floor(Number(minutes) || 0));
      const s = Math.max(0, Math.floor(Number(seconds) || 0));
      const penaltyMs = (h * 3600 + m * 60 + s) * 1000;

      if (penaltyMs <= 0) return errorResponse('Penalty time must be greater than 0', 400);

      // Upsert: insert or update if exists
      const existing: any = await query(
        'SELECT id FROM Penalty WHERE eventId = ? AND bib = ? LIMIT 1',
        [eventId, bib]
      );

      if (existing.length > 0) {
        await query(
          'UPDATE Penalty SET epc = ?, hours = ?, minutes = ?, seconds = ?, penaltyMs = ?, updatedAt = NOW() WHERE eventId = ? AND bib = ?',
          [epc, h, m, s, penaltyMs, eventId, bib]
        );
      } else {
        const id = crypto.randomUUID();
        await query(
          'INSERT INTO Penalty (id, eventId, bib, epc, hours, minutes, seconds, penaltyMs, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
          [id, eventId, bib, epc, h, m, s, penaltyMs]
        );
      }

      const updated: any = await query(
        'SELECT id, eventId, bib, epc, hours, minutes, seconds, penaltyMs, createdAt FROM Penalty WHERE eventId = ? AND bib = ? LIMIT 1',
        [eventId, bib]
      );

      return successResponse(updated[0]);
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return errorResponse('id is required', 400);

      await query('DELETE FROM Penalty WHERE id = ? AND eventId = ?', [id, eventId]);
      return successResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[PENALTY] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
