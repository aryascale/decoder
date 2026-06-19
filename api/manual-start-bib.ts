import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    if (event.httpMethod === 'GET') {
      const manualStarts: any = await query(
        'SELECT id, eventId, bib, epc, timeStr, createdAt FROM ManualStart WHERE eventId = ? ORDER BY createdAt DESC',
        [eventId]
      );
      return successResponse(manualStarts);
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { bib, epc, timeStr } = body;

      if (!bib || !epc || !timeStr) {
        return errorResponse('bib, epc, and timeStr are required', 400);
      }

      // Upsert: insert or update if exists
      const existing: any = await query(
        'SELECT id FROM ManualStart WHERE eventId = ? AND bib = ? LIMIT 1',
        [eventId, bib]
      );

      if (existing.length > 0) {
        await query(
          'UPDATE ManualStart SET epc = ?, timeStr = ?, updatedAt = NOW() WHERE eventId = ? AND bib = ?',
          [epc, timeStr, eventId, bib]
        );
      } else {
        const id = crypto.randomUUID();
        await query(
          'INSERT INTO ManualStart (id, eventId, bib, epc, timeStr, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [id, eventId, bib, epc, timeStr]
        );
      }

      const updated: any = await query(
        'SELECT id, eventId, bib, epc, timeStr, createdAt FROM ManualStart WHERE eventId = ? AND bib = ? LIMIT 1',
        [eventId, bib]
      );

      await logActivity('event.update', `Manual Start for BIB ${bib} set to ${timeStr}`, 'admin', eventId);

      return successResponse(updated[0]);
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return errorResponse('id is required', 400);

      const existing: any = await query('SELECT bib FROM ManualStart WHERE id = ? AND eventId = ? LIMIT 1', [id, eventId]);
      if (existing.length === 0) return errorResponse('Manual Start not found', 404);

      await query('DELETE FROM ManualStart WHERE id = ? AND eventId = ?', [id, eventId]);
      await logActivity('event.update', `Manual Start for BIB ${existing[0].bib} removed`, 'admin', eventId);

      return successResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[MANUAL-START-BIB] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
