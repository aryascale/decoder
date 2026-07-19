import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';
import { logActivity } from '../src/lib/activity-logger';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    if (event.httpMethod === 'GET') {
      const manualFinishes: any = await query(
        'SELECT id, eventId, bib, epc, timeStr, createdAt FROM ManualFinish WHERE eventId = ? ORDER BY createdAt DESC',
        [eventId]
      );
      return successResponse(manualFinishes);
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      let { bib, epc, timeStr, clickTimestamp } = body;

      if (!bib || !epc) {
        return errorResponse('bib and epc are required', 400);
      }

      if (clickTimestamp) {
        const ev: any = await query('SELECT timezoneOffset FROM Event WHERE id = ? LIMIT 1', [eventId]);
        const tz = ev[0]?.timezoneOffset ?? 7;
        
        const d = new Date(clickTimestamp);
        d.setUTCHours(d.getUTCHours() + tz);
        
        const pad = (n: number, len = 2) => String(n).padStart(len, "0");
        const HH = pad(d.getUTCHours());
        const mm = pad(d.getUTCMinutes());
        const ss = pad(d.getUTCSeconds());
        
        timeStr = `${HH}:${mm}:${ss}`;
      }

      if (!timeStr) {
        return errorResponse('timeStr or clickTimestamp is required', 400);
      }

      // Upsert: insert or update if exists
      const existing: any = await query(
        'SELECT id FROM ManualFinish WHERE eventId = ? AND bib = ? LIMIT 1',
        [eventId, bib]
      );

      if (existing.length > 0) {
        await query(
          'UPDATE ManualFinish SET epc = ?, timeStr = ?, updatedAt = NOW() WHERE eventId = ? AND bib = ?',
          [epc, timeStr, eventId, bib]
        );
      } else {
        const id = crypto.randomUUID();
        await query(
          'INSERT INTO ManualFinish (id, eventId, bib, epc, timeStr, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          [id, eventId, bib, epc, timeStr]
        );
      }

      const updated: any = await query(
        'SELECT id, eventId, bib, epc, timeStr, createdAt FROM ManualFinish WHERE eventId = ? AND bib = ? LIMIT 1',
        [eventId, bib]
      );

      await logActivity('event.update', `Manual Finish for BIB ${bib} set to ${timeStr}`, 'admin', eventId);

      return successResponse(updated[0]);
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return errorResponse('id is required', 400);

      const existing: any = await query('SELECT bib FROM ManualFinish WHERE id = ? AND eventId = ? LIMIT 1', [id, eventId]);
      if (existing.length === 0) return errorResponse('Manual Finish not found', 404);

      await query('DELETE FROM ManualFinish WHERE id = ? AND eventId = ?', [id, eventId]);
      await logActivity('event.update', `Manual Finish for BIB ${existing[0].bib} removed`, 'admin', eventId);

      return successResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[MANUAL-FINISH-BIB] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
