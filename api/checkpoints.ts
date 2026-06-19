import { query } from '../src/lib/db';
import { successResponse, errorResponse, parseBody, CORS_HEADERS } from '../src/lib/api-utils';

export default async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS_HEADERS, body: '' };

  try {
    const eventId = event.queryStringParameters?.eventId;
    if (!eventId) return errorResponse('eventId is required', 400);

    if (event.httpMethod === 'GET') {
      const checkpoints: any = await query(
        'SELECT * FROM Checkpoint WHERE eventId = ? ORDER BY `order` ASC', [eventId]
      );
      return successResponse({ checkpoints: checkpoints.map((c: any) => ({ id: c.id, name: c.name, identitas: c.identitas, order: c.order })) });
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      const body = parseBody(event);
      if (!body) return errorResponse('Missing request body', 400);

      const { checkpoints } = body;
      if (!Array.isArray(checkpoints)) return errorResponse('checkpoints must be an array', 400);

      const existingCps: any = await query('SELECT * FROM Checkpoint WHERE eventId = ? ORDER BY `order` ASC', [eventId]);
      const existingMap = new Map(existingCps.map((c: any) => [c.identitas, c]));
      const newIds = new Set(checkpoints.map((c: any) => c.identitas));

      // Delete checkpoints not in new list
      for (const existing of existingCps) {
        if (!newIds.has(existing.identitas)) {
          await query('DELETE FROM Checkpoint WHERE id = ?', [existing.id]);
        }
      }

      // Upsert checkpoints
      for (let i = 0; i < checkpoints.length; i++) {
        const cp = checkpoints[i];
        if (!cp.name || !cp.identitas) continue;
        
        const existing = existingMap.get(cp.identitas) as any;
        if (existing) {
          await query('UPDATE Checkpoint SET `order` = ?, name = ? WHERE id = ?', [i, cp.name, existing.id]);
        } else {
          await query(
            'INSERT INTO Checkpoint (id, eventId, name, identitas, `order`, createdAt) VALUES (?, ?, ?, ?, ?, NOW())',
            [crypto.randomUUID(), eventId, cp.name, cp.identitas, i]
          );
        }
      }

      const updated: any = await query(
        'SELECT * FROM Checkpoint WHERE eventId = ? ORDER BY `order` ASC', [eventId]
      );

      const { logActivity } = await import('../src/lib/activity-logger');
      await logActivity('event.update_checkpoints', `Update checkpoints untuk event ${eventId}`, 'admin', eventId);

      return successResponse({ checkpoints: updated.map((c: any) => ({ id: c.id, name: c.name, identitas: c.identitas, order: c.order })) });
    }

    return errorResponse('Method not allowed', 405);
  } catch (error: any) {
    console.error('[CHECKPOINTS] Error:', error);
    return errorResponse(error.message || 'Internal server error');
  }
}
